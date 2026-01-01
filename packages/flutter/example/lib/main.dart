import 'package:flutter/material.dart';
import 'package:aura_verifier/aura_verifier.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aura Verifier Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Aura Verifier Demo'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  late AuraVerifierEnhanced _verifier;
  bool _initialized = false;
  VerificationResult? _lastResult;
  String _statusMessage = 'Not initialized';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initializeVerifier();
  }

  Future<void> _initializeVerifier() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Initializing...';
    });

    try {
      _verifier = AuraVerifierEnhanced(
        network: AuraNetwork.testnet,
        offlineMode: false,
        cacheConfig: const CacheConfig(
          maxAgeSeconds: 3600,
          maxEntries: 100,
          persistToDisk: true,
        ),
      );

      // Listen to events
      _verifier.events.listen((event) {
        debugPrint('Verifier Event: ${event.type} - ${event.data}');
      });

      await _verifier.initialize();

      setState(() {
        _initialized = true;
        _statusMessage = 'Ready to verify credentials';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Initialization failed: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _scanQRCode() async {
    if (!_initialized) {
      _showError('Verifier not initialized');
      return;
    }

    try {
      final result = await Navigator.of(context).push<VerificationResult>(
        MaterialPageRoute(
          builder: (context) => AuraQRScannerPage(
            verifier: _verifier,
            title: 'Scan Aura QR Code',
          ),
        ),
      );

      if (result != null) {
        setState(() {
          _lastResult = result;
          _statusMessage = result.isValid
              ? 'Verification successful!'
              : 'Verification failed: ${result.verificationError}';
        });
      }
    } catch (e) {
      _showError('Scan failed: $e');
    }
  }

  Future<void> _verifyTestCredential() async {
    if (!_initialized) {
      _showError('Verifier not initialized');
      return;
    }

    setState(() {
      _isLoading = true;
      _statusMessage = 'Verifying...';
    });

    try {
      // This is a mock QR code for testing
      // In production, you would get this from scanning an actual QR code
      final testQRData = _createTestQRCode();

      final result = await _verifier.verify(testQRData);

      setState(() {
        _lastResult = result;
        _statusMessage = result.isValid
            ? 'Verification successful!'
            : 'Verification failed: ${result.verificationError}';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Verification error: $e';
        _isLoading = false;
      });
    }
  }

  String _createTestQRCode() {
    // Create a test QR code (this would normally come from scanning)
    // Note: This won't actually verify against the blockchain without real data
    final qrData = {
      'v': '1.0',
      'p': 'test-presentation-${DateTime.now().millisecondsSinceEpoch}',
      'h': 'did:aura:testnet:test123',
      'vcs': ['test-vc-1'],
      'ctx': {'age': true},
      'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600,
      'n': DateTime.now().millisecondsSinceEpoch,
      'sig': 'test-signature',
    };

    return 'test-qr-data'; // Simplified for demo
  }

  void _showCacheStats() {
    final stats = _verifier.getCacheStats();
    if (stats != null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cache Statistics'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('DID Cache: ${stats.didCacheSize} entries'),
              Text('VC Status Cache: ${stats.vcStatusCacheSize} entries'),
              Text('Result Cache: ${stats.resultCacheSize} entries'),
              const SizedBox(height: 8),
              Text('Total: ${stats.totalEntries}/${stats.maxEntries}'),
              Text('Usage: ${stats.usagePercent.toStringAsFixed(1)}%'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                await _verifier.clearCache();
                if (context.mounted) {
                  Navigator.of(context).pop();
                  _showMessage('Cache cleared');
                }
              },
              child: const Text('Clear Cache'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _verifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
        actions: [
          if (_initialized)
            IconButton(
              icon: const Icon(Icons.storage),
              onPressed: _showCacheStats,
              tooltip: 'Cache Stats',
            ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              _initialized ? Icons.check_circle : Icons.circle_outlined,
              size: 64,
              color: _initialized ? Colors.green : Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              _statusMessage,
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            if (_isLoading)
              const CircularProgressIndicator()
            else if (_initialized) ...[
              ElevatedButton.icon(
                onPressed: _scanQRCode,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan QR Code'),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _verifyTestCredential,
                icon: const Icon(Icons.verified_user),
                label: const Text('Test Verification'),
              ),
            ] else
              ElevatedButton(
                onPressed: _initializeVerifier,
                child: const Text('Retry Initialization'),
              ),
            const SizedBox(height: 32),
            if (_lastResult != null) _buildResultCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    final result = _lastResult!;
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  result.isValid ? Icons.check_circle : Icons.error,
                  color: result.isValid ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 8),
                Text(
                  result.isValid ? 'Valid' : 'Invalid',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Holder DID', result.holderDID),
            _buildInfoRow('Audit ID', result.auditId),
            _buildInfoRow('Method', result.method.name),
            _buildInfoRow('Latency', '${result.networkLatencyMs}ms'),
            if (result.attributes.isOver21)
              const Chip(
                label: Text('Age 21+'),
                backgroundColor: Colors.green,
              ),
            if (result.attributes.isOver18 && !result.attributes.isOver21)
              const Chip(
                label: Text('Age 18+'),
                backgroundColor: Colors.blue,
              ),
            const SizedBox(height: 8),
            Text(
              'Credentials: ${result.vcDetails.length}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
