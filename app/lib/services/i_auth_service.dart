import 'package:supabase_flutter/supabase_flutter.dart';

abstract class IAuthService {
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  });

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  });

  Future<void> signOut();

  User? get currentUser;

  Stream<AuthState> get authStateChanges;

  Future<void> resetPassword({required String email});

  Future<void> updatePassword({required String password});
} 