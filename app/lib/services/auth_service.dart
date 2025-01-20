import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'i_auth_service.dart';

class AuthService implements IAuthService {
  final SupabaseClient _client;
  
  AuthService([SupabaseClient? client]) : _client = client ?? Supabase.instance.client;

  String get _redirectUrl {
    if (kIsWeb) return '/#/reset-password';
    return 'reset-callback';
  }

  @override
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    return await _client.auth.signUp(
      email: email,
      password: password,
    );
  }

  @override
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  @override
  User? get currentUser => _client.auth.currentUser;

  @override
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  @override
  Future<void> resetPassword({required String email}) async {
    print('Sending reset password email with redirect URL: $_redirectUrl');
    await _client.auth.resetPasswordForEmail(
      email,
      redirectTo: _redirectUrl,
    );
  }

  @override
  Future<void> updatePassword({required String password}) async {
    await _client.auth.updateUser(
      UserAttributes(password: password),
    );
  }
} 