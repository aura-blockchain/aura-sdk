/// QR Code scanner widget for Aura credentials
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'verifier.dart';
import 'types.dart';
import 'errors.dart';

/// Callback for successful QR scan
typedef OnQRScanned = void Function(String qrData);

/// Callback for verification complete
typedef OnVerificationComplete = void Function(VerificationResult result);

/// Callback for errors
typedef OnScanError = void Function(AuraVerifierException error);

/// Widget for scanning and verifying Aura QR codes
class AuraQRScanner extends StatefulWidget {
  /// The verifier instance to use for verification
  final AuraVerifier verifier;

  /// Whether to automatically verify scanned QR codes
  final bool autoVerify;

  /// Callback when QR code is scanned (before verification)
  final OnQRScanned? onScanned;

  /// Callback when verification completes successfully
  final OnVerificationComplete? onVerificationComplete;

  /// Callback when an error occurs
  final OnScanError? onError;

  /// Whether to show overlay with scanning hints
  final bool showOverlay;

  /// Custom overlay widget
  final Widget? overlay;

  /// Whether to allow multiple scans
  final bool allowMultipleScans;

  const AuraQRScanner({
    super.key,
    required this.verifier,
    this.autoVerify = true,
    this.onScanned,
    this.onVerificationComplete,
    this.onError,
    this.showOverlay = true,
    this.overlay,
    this.allowMultipleScans = false,
  });

  @override
  State<AuraQRScanner> createState() => _AuraQRScannerState();
}

class _AuraQRScannerState extends State<AuraQRScanner> {
  MobileScannerController? _controller;
  bool _isProcessing = false;
  bool _hasScanned = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    if (_hasScanned && !widget.allowMultipleScans) return;

    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final qrData = barcode!.rawValue!;

    setState(() {
      _isProcessing = true;
      _hasScanned = true;
    });

    try {
      // Notify that QR was scanned
      widget.onScanned?.call(qrData);

      // Auto-verify if enabled
      if (widget.autoVerify) {
        final result = await widget.verifier.verify(qrData);
        widget.onVerificationComplete?.call(result);
      }
    } on AuraVerifierException catch (e) {
      widget.onError?.call(e);
    } catch (e) {
      widget.onError?.call(
        AuraVerifierException(
          'Unexpected error: $e',
          code: AuraErrorCode.unknown,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(
          controller: _controller,
          onDetect: _onDetect,
        ),
        if (widget.showOverlay) _buildOverlay(),
        if (_isProcessing) _buildProcessingIndicator(),
      ],
    );
  }

  Widget _buildOverlay() {
    if (widget.overlay != null) {
      return widget.overlay!;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
      ),
      child: Center(
        child: Container(
          width: 280,
          height: 280,
          decoration: BoxDecoration(
            border: Border.all(
              color: Colors.white,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.qr_code_scanner,
                color: Colors.white,
                size: 64,
              ),
              const SizedBox(height: 16),
              Text(
                'Scan Aura QR Code',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Align the QR code within the frame',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white70,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingIndicator() {
    return Container(
      color: Colors.black.withOpacity(0.7),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
            const SizedBox(height: 16),
            Text(
              'Verifying...',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Simple QR scanner that returns the scanned data
class SimpleAuraQRScanner extends StatelessWidget {
  /// Callback when QR code is scanned
  final OnQRScanned onScanned;

  /// Callback when an error occurs
  final OnScanError? onError;

  const SimpleAuraQRScanner({
    super.key,
    required this.onScanned,
    this.onError,
  });

  @override
  Widget build(BuildContext context) {
    return MobileScanner(
      onDetect: (capture) {
        final barcode = capture.barcodes.firstOrNull;
        if (barcode?.rawValue != null) {
          onScanned(barcode!.rawValue!);
        }
      },
    );
  }
}

/// Full-screen QR scanner page
class AuraQRScannerPage extends StatelessWidget {
  final AuraVerifier verifier;
  final bool autoVerify;
  final OnVerificationComplete? onVerificationComplete;
  final String? title;

  const AuraQRScannerPage({
    super.key,
    required this.verifier,
    this.autoVerify = true,
    this.onVerificationComplete,
    this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title ?? 'Scan QR Code'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: AuraQRScanner(
        verifier: verifier,
        autoVerify: autoVerify,
        onVerificationComplete: (result) {
          onVerificationComplete?.call(result);
          Navigator.of(context).pop(result);
        },
        onError: (error) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error.message),
              backgroundColor: Colors.red,
            ),
          );
        },
      ),
    );
  }
}
