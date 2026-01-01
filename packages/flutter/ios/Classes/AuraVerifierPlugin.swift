import Flutter
import UIKit

/// Flutter plugin for Aura Verifier SDK
public class AuraVerifierPlugin: NSObject, FlutterPlugin {

    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(
            name: "aura_verifier",
            binaryMessenger: registrar.messenger()
        )
        let instance = AuraVerifierPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getPlatformVersion":
            result("iOS " + UIDevice.current.systemVersion)

        case "verifyCredential":
            handleVerifyCredential(call, result: result)

        case "parseQRCode":
            handleParseQRCode(call, result: result)

        case "checkCredentialStatus":
            handleCheckCredentialStatus(call, result: result)

        case "getCachedCredentials":
            handleGetCachedCredentials(call, result: result)

        case "clearCache":
            handleClearCache(call, result: result)

        default:
            result(FlutterMethodNotImplemented)
        }
    }

    // MARK: - Method Handlers

    private func handleVerifyCredential(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let qrCodeData = args["qrCodeData"] as? String,
              let restEndpoint = args["restEndpoint"] as? String else {
            result(FlutterError(
                code: "INVALID_ARGUMENTS",
                message: "Missing required arguments",
                details: nil
            ))
            return
        }

        let verifierAddress = args["verifierAddress"] as? String
        let timeoutMs = args["timeoutMs"] as? Int ?? 10000

        // Perform verification via REST API
        verifyViaREST(
            qrCodeData: qrCodeData,
            restEndpoint: restEndpoint,
            verifierAddress: verifierAddress,
            timeoutMs: timeoutMs
        ) { verificationResult, error in
            if let error = error {
                result(FlutterError(
                    code: "VERIFICATION_ERROR",
                    message: error.localizedDescription,
                    details: nil
                ))
            } else {
                result(verificationResult)
            }
        }
    }

    private func handleParseQRCode(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let qrCodeData = args["qrCodeData"] as? String else {
            result(FlutterError(
                code: "INVALID_ARGUMENTS",
                message: "Missing qrCodeData",
                details: nil
            ))
            return
        }

        do {
            let parsed = try parseQRCodeData(qrCodeData)
            result(parsed)
        } catch {
            result(FlutterError(
                code: "PARSE_ERROR",
                message: error.localizedDescription,
                details: nil
            ))
        }
    }

    private func handleCheckCredentialStatus(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let args = call.arguments as? [String: Any],
              let vcId = args["vcId"] as? String,
              let restEndpoint = args["restEndpoint"] as? String else {
            result(FlutterError(
                code: "INVALID_ARGUMENTS",
                message: "Missing required arguments",
                details: nil
            ))
            return
        }

        checkVCStatus(
            vcId: vcId,
            restEndpoint: restEndpoint
        ) { status, error in
            if let error = error {
                result(FlutterError(
                    code: "STATUS_CHECK_ERROR",
                    message: error.localizedDescription,
                    details: nil
                ))
            } else {
                result(status)
            }
        }
    }

    private func handleGetCachedCredentials(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        // In a production implementation, this would retrieve cached credentials
        // from secure storage (Keychain on iOS)
        result([])
    }

    private func handleClearCache(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        // In a production implementation, this would clear the Keychain
        result(true)
    }

    // MARK: - Helper Methods

    private func verifyViaREST(
        qrCodeData: String,
        restEndpoint: String,
        verifierAddress: String?,
        timeoutMs: Int,
        completion: @escaping ([String: Any]?, Error?) -> Void
    ) {
        let urlString = "\(restEndpoint)/aura/vcregistry/v1beta1/verify_presentation"
        guard let url = URL(string: urlString) else {
            completion(nil, NSError(
                domain: "AuraVerifier",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]
            ))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = TimeInterval(timeoutMs) / 1000.0

        var body: [String: Any] = ["qr_code_data": qrCodeData]
        if let verifierAddress = verifierAddress {
            body["verifier_address"] = verifierAddress
        }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(nil, error)
            return
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(nil, error)
                return
            }

            guard let data = data,
                  let httpResponse = response as? HTTPURLResponse else {
                completion(nil, NSError(
                    domain: "AuraVerifier",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response"]
                ))
                return
            }

            if httpResponse.statusCode == 200 {
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        let result = json["result"] as? [String: Any] ?? json
                        completion(result, nil)
                    } else {
                        completion(nil, NSError(
                            domain: "AuraVerifier",
                            code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response"]
                        ))
                    }
                } catch {
                    completion(nil, error)
                }
            } else {
                completion(nil, NSError(
                    domain: "AuraVerifier",
                    code: httpResponse.statusCode,
                    userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"]
                ))
            }
        }

        task.resume()
    }

    private func checkVCStatus(
        vcId: String,
        restEndpoint: String,
        completion: @escaping ([String: Any]?, Error?) -> Void
    ) {
        let urlString = "\(restEndpoint)/aura/vcregistry/v1beta1/vc_status/\(vcId)"
        guard let url = URL(string: urlString) else {
            completion(nil, NSError(
                domain: "AuraVerifier",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]
            ))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(nil, error)
                return
            }

            guard let data = data,
                  let httpResponse = response as? HTTPURLResponse else {
                completion(nil, NSError(
                    domain: "AuraVerifier",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response"]
                ))
                return
            }

            if httpResponse.statusCode == 200 {
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        completion(json, nil)
                    } else {
                        completion(nil, NSError(
                            domain: "AuraVerifier",
                            code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response"]
                        ))
                    }
                } catch {
                    completion(nil, error)
                }
            } else {
                completion(nil, NSError(
                    domain: "AuraVerifier",
                    code: httpResponse.statusCode,
                    userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"]
                ))
            }
        }

        task.resume()
    }

    private func parseQRCodeData(_ qrCodeData: String) throws -> [String: Any] {
        var base64Data = qrCodeData

        // Remove URL prefix if present
        if qrCodeData.hasPrefix("aura://verify?data=") {
            base64Data = String(qrCodeData.dropFirst("aura://verify?data=".count))
        }

        // Decode base64
        guard let data = Data(base64Encoded: base64Data),
              let jsonString = String(data: data, encoding: .utf8),
              let jsonData = jsonString.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            throw NSError(
                domain: "AuraVerifier",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid QR code format"]
            )
        }

        return json
    }
}
