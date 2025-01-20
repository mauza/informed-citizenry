import 'package:flutter/material.dart';
import 'package:informed_citizenry_app/components/common/error_display.dart';
import 'package:informed_citizenry_app/components/common/loading_state.dart';
import 'package:informed_citizenry_app/utils/constants.dart';
import 'package:informed_citizenry_app/utils/snackbar_utils.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ResetPasswordPage extends StatefulWidget {
  @override
  _ResetPasswordPageState createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  dynamic _error;
  String? _accessToken;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _checkAccessToken();
    });
  }

  Future<void> _checkAccessToken() async {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final accessToken = args?['access_token'] as String?;
    final refreshToken = args?['refresh_token'] as String?;

    if (accessToken == null || refreshToken == null) {
      print('Missing tokens - Access Token: ${accessToken != null}, Refresh Token: ${refreshToken != null}');
      // No tokens, redirect to login
      Navigator.pushReplacementNamed(context, AppConstants.loginRoute);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid or expired password reset link. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    print('Got access token: ${accessToken.substring(0, 20)}...');
    print('Got refresh token: ${refreshToken.substring(0, 10)}...');
    setState(() {
      _accessToken = accessToken;
    });
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _updatePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      print('Attempting to verify recovery token and update password...');
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      final accessToken = args?['access_token'] as String?;
      final email = args?['email'] as String?;
      
      if (accessToken == null) {
        throw Exception('Missing access token');
      }
      if (email == null) {
        throw Exception('Missing email');
      }

      // First verify the recovery token
      await Supabase.instance.client.auth.verifyOTP(
        type: OtpType.recovery,
        token: accessToken,
        email: email,
      );
      print('Recovery token verified successfully');

      // Now update the password
      await Supabase.instance.client.auth.updateUser(
        UserAttributes(
          password: _passwordController.text,
        ),
      );
      print('Password updated successfully');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pushReplacementNamed(context, AppConstants.loginRoute);
      }
    } catch (error) {
      print('Failed to update password: $error');
      if (mounted) {
        setState(() {
          _error = error;
          _isLoading = false;
        });
        SnackbarUtils.showError(context, error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show loading while checking access token
    if (_accessToken == null) {
      return const Scaffold(
        body: LoadingState(message: 'Verifying reset password link...'),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('Reset Password')),
      body: _isLoading
          ? const LoadingState(message: 'Updating password...')
          : SingleChildScrollView(
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Create New Password',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).primaryColor,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Please enter your new password below',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: Colors.grey[600],
                            ),
                            textAlign: TextAlign.center,
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 24),
                            ErrorDisplay(
                              error: _error,
                              showRetry: false,
                            ),
                          ],
                          const SizedBox(height: 48),
                          TextFormField(
                            controller: _passwordController,
                            decoration: const InputDecoration(
                              labelText: 'New Password',
                              border: OutlineInputBorder(),
                            ),
                            obscureText: true,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return AppConstants.passwordRequired;
                              }
                              if (value.length < 6) {
                                return 'Password must be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _confirmPasswordController,
                            decoration: const InputDecoration(
                              labelText: 'Confirm New Password',
                              border: OutlineInputBorder(),
                            ),
                            obscureText: true,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please confirm your password';
                              }
                              if (value != _passwordController.text) {
                                return 'Passwords do not match';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _updatePassword,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: const Text(
                              'Update Password',
                              style: TextStyle(fontSize: 18),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
    );
  }
} 