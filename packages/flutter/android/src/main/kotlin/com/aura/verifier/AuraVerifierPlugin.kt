package com.aura.verifier

import android.util.Base64
import androidx.annotation.NonNull
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/** AuraVerifierPlugin */
class AuraVerifierPlugin : FlutterPlugin, MethodCallHandler {
    private lateinit var channel: MethodChannel
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun onAttachedToEngine(@NonNull flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(flutterPluginBinding.binaryMessenger, "aura_verifier")
        channel.setMethodCallHandler(this)
    }

    override fun onMethodCall(@NonNull call: MethodCall, @NonNull result: Result) {
        when (call.method) {
            "getPlatformVersion" -> {
                result.success("Android ${android.os.Build.VERSION.RELEASE}")
            }

            "verifyCredential" -> {
                handleVerifyCredential(call, result)
            }

            "parseQRCode" -> {
                handleParseQRCode(call, result)
            }

            "checkCredentialStatus" -> {
                handleCheckCredentialStatus(call, result)
            }

            "getCachedCredentials" -> {
                handleGetCachedCredentials(call, result)
            }

            "clearCache" -> {
                handleClearCache(call, result)
            }

            else -> {
                result.notImplemented()
            }
        }
    }

    override fun onDetachedFromEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }

    // MARK: - Method Handlers

    private fun handleVerifyCredential(call: MethodCall, result: Result) {
        val qrCodeData = call.argument<String>("qrCodeData")
        val restEndpoint = call.argument<String>("restEndpoint")
        val verifierAddress = call.argument<String?>("verifierAddress")
        val timeoutMs = call.argument<Int>("timeoutMs") ?: 10000

        if (qrCodeData == null || restEndpoint == null) {
            result.error("INVALID_ARGUMENTS", "Missing required arguments", null)
            return
        }

        scope.launch {
            try {
                val verificationResult = verifyViaREST(
                    qrCodeData,
                    restEndpoint,
                    verifierAddress,
                    timeoutMs
                )
                result.success(verificationResult)
            } catch (e: Exception) {
                result.error("VERIFICATION_ERROR", e.message, null)
            }
        }
    }

    private fun handleParseQRCode(call: MethodCall, result: Result) {
        val qrCodeData = call.argument<String>("qrCodeData")

        if (qrCodeData == null) {
            result.error("INVALID_ARGUMENTS", "Missing qrCodeData", null)
            return
        }

        try {
            val parsed = parseQRCodeData(qrCodeData)
            result.success(parsed)
        } catch (e: Exception) {
            result.error("PARSE_ERROR", e.message, null)
        }
    }

    private fun handleCheckCredentialStatus(call: MethodCall, result: Result) {
        val vcId = call.argument<String>("vcId")
        val restEndpoint = call.argument<String>("restEndpoint")

        if (vcId == null || restEndpoint == null) {
            result.error("INVALID_ARGUMENTS", "Missing required arguments", null)
            return
        }

        scope.launch {
            try {
                val status = checkVCStatus(vcId, restEndpoint)
                result.success(status)
            } catch (e: Exception) {
                result.error("STATUS_CHECK_ERROR", e.message, null)
            }
        }
    }

    private fun handleGetCachedCredentials(call: MethodCall, result: Result) {
        // In a production implementation, this would retrieve cached credentials
        // from secure storage (EncryptedSharedPreferences on Android)
        result.success(emptyList<Map<String, Any>>())
    }

    private fun handleClearCache(call: MethodCall, result: Result) {
        // In a production implementation, this would clear the secure storage
        result.success(true)
    }

    // MARK: - Helper Methods

    private suspend fun verifyViaREST(
        qrCodeData: String,
        restEndpoint: String,
        verifierAddress: String?,
        timeoutMs: Int
    ): Map<String, Any> = withContext(Dispatchers.IO) {
        val urlString = "$restEndpoint/aura/vcregistry/v1beta1/verify_presentation"
        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.connectTimeout = timeoutMs
            connection.readTimeout = timeoutMs
            connection.doOutput = true

            // Build request body
            val body = JSONObject().apply {
                put("qr_code_data", qrCodeData)
                verifierAddress?.let { put("verifier_address", it) }
            }

            // Write request body
            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
                writer.flush()
            }

            // Read response
            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val response = BufferedReader(InputStreamReader(connection.inputStream)).use { reader ->
                    reader.readText()
                }

                val json = JSONObject(response)
                val result = if (json.has("result")) {
                    json.getJSONObject("result")
                } else {
                    json
                }

                return@withContext jsonToMap(result)
            } else {
                throw Exception("HTTP ${connection.responseCode}")
            }
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun checkVCStatus(
        vcId: String,
        restEndpoint: String
    ): Map<String, Any> = withContext(Dispatchers.IO) {
        val urlString = "$restEndpoint/aura/vcregistry/v1beta1/vc_status/$vcId"
        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = "GET"
            connection.setRequestProperty("Accept", "application/json")

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val response = BufferedReader(InputStreamReader(connection.inputStream)).use { reader ->
                    reader.readText()
                }

                val json = JSONObject(response)
                return@withContext jsonToMap(json)
            } else {
                throw Exception("HTTP ${connection.responseCode}")
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun parseQRCodeData(qrCodeData: String): Map<String, Any> {
        var base64Data = qrCodeData

        // Remove URL prefix if present
        if (qrCodeData.startsWith("aura://verify?data=")) {
            base64Data = qrCodeData.substring("aura://verify?data=".length)
        }

        // Decode base64
        val decoded = Base64.decode(base64Data, Base64.DEFAULT)
        val jsonString = String(decoded, Charsets.UTF_8)
        val json = JSONObject(jsonString)

        return jsonToMap(json)
    }

    private fun jsonToMap(json: JSONObject): Map<String, Any> {
        val map = mutableMapOf<String, Any>()
        json.keys().forEach { key ->
            val value = json.get(key)
            map[key] = when (value) {
                is JSONObject -> jsonToMap(value)
                JSONObject.NULL -> null as Any
                else -> value
            }
        }
        return map
    }
}
