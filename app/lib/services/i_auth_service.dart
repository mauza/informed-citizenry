import 'package:pocketbase/pocketbase.dart';

abstract class IAuthService {
  Future<RecordAuth> signUp({required String email, required String password});

  Future<RecordAuth> signIn({required String email, required String password});

  Future<void> signOut();

  RecordModel? get currentUser;

  Stream<AuthStoreEvent> get authStateChanges;

  Future<void> resetPassword({required String email});

  Future<void> confirmPasswordReset({
    required String token,
    required String password,
  });

  Future<void> updatePassword({required String password});
}
