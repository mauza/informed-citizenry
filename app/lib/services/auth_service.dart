import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:pocketbase/pocketbase.dart';
import 'i_auth_service.dart';

class AuthService implements IAuthService {
  final PocketBase _pb;

  AuthService([PocketBase? pb])
    : _pb = pb ?? PocketBase('http://localhost:8090');

  String get _redirectUrl {
    if (kIsWeb) return '${Uri.base.origin}/#/reset-password';
    return 'guru.mau.happyinvesting://reset-callback';
  }

  @override
  Future<RecordAuth> signUp({
    required String email,
    required String password,
  }) async {
    final body = {
      'email': email,
      'password': password,
      'passwordConfirm': password,
    };

    await _pb.collection('users').create(body: body);

    return await _pb.collection('users').authWithPassword(email, password);
  }

  @override
  Future<RecordAuth> signIn({
    required String email,
    required String password,
  }) async {
    return await _pb.collection('users').authWithPassword(email, password);
  }

  @override
  Future<void> signOut() async {
    _pb.authStore.clear();
  }

  @override
  RecordModel? get currentUser => _pb.authStore.model;

  @override
  Stream<AuthStoreEvent> get authStateChanges => _pb.authStore.onChange;

  @override
  Future<void> resetPassword({required String email}) async {
    await _pb.collection('users').requestPasswordReset(email);
  }

  @override
  Future<void> confirmPasswordReset({
    required String token,
    required String password,
  }) async {
    await _pb
        .collection('users')
        .confirmPasswordReset(token, password, password);
  }

  @override
  Future<void> updatePassword({required String password}) async {
    final userId = _pb.authStore.model?.id;
    if (userId == null) {
      throw Exception('No authenticated user');
    }

    await _pb
        .collection('users')
        .update(
          userId,
          body: {'password': password, 'passwordConfirm': password},
        );
  }
}
