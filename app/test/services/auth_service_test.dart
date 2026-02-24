import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:pocketbase/pocketbase.dart';
import 'package:informed_citizenry_app/services/auth_service.dart';

class MockPocketBase extends Mock implements PocketBase {}

class MockAuthStore extends Mock implements AuthStore {}

class MockRecordService extends Mock implements RecordService {}

void main() {
  late AuthService authService;
  late MockPocketBase mockPb;
  late MockAuthStore mockAuthStore;
  late MockRecordService mockRecordService;

  setUp(() {
    mockPb = MockPocketBase();
    mockAuthStore = MockAuthStore();
    mockRecordService = MockRecordService();

    when(() => mockPb.authStore).thenReturn(mockAuthStore);
    when(() => mockPb.collection('users')).thenReturn(mockRecordService);

    authService = AuthService(mockPb);
  });

  group('AuthService Tests', () {
    group('signUp', () {
      test('should create user and sign in successfully', () async {
        const email = 'test@example.com';
        const password = 'password123';

        final mockRecordAuth = RecordAuth(
          token: 'test-token',
          record: RecordModel({'id': 'user-123', 'email': email}),
        );

        when(() => mockRecordService.create(body: any(named: 'body')))
            .thenAnswer((_) async => RecordModel({}));
        when(() => mockRecordService.authWithPassword(email, password))
            .thenAnswer((_) async => mockRecordAuth);

        final result =
            await authService.signUp(email: email, password: password);

        expect(result.token, equals('test-token'));
        expect(result.record.id, equals('user-123'));
        verify(() => mockRecordService.create(body: any(named: 'body')))
            .called(1);
        verify(() => mockRecordService.authWithPassword(email, password))
            .called(1);
      });

      test('should throw exception when create fails', () async {
        const email = 'test@example.com';
        const password = 'password123';

        when(() => mockRecordService.create(body: any(named: 'body')))
            .thenThrow(Exception('Create failed'));

        expect(
          () => authService.signUp(email: email, password: password),
          throwsException,
        );
      });
    });

    group('signIn', () {
      test('should sign in user successfully', () async {
        const email = 'test@example.com';
        const password = 'password123';

        final mockRecordAuth = RecordAuth(
          token: 'test-token',
          record: RecordModel({'id': 'user-123', 'email': email}),
        );

        when(() => mockRecordService.authWithPassword(email, password))
            .thenAnswer((_) async => mockRecordAuth);

        final result =
            await authService.signIn(email: email, password: password);

        expect(result.token, equals('test-token'));
        expect(result.record.id, equals('user-123'));
        verify(() => mockRecordService.authWithPassword(email, password))
            .called(1);
      });

      test('should throw exception when auth fails', () async {
        const email = 'test@example.com';
        const password = 'wrong-password';

        when(() => mockRecordService.authWithPassword(email, password))
            .thenThrow(Exception('Invalid credentials'));

        expect(
          () => authService.signIn(email: email, password: password),
          throwsException,
        );
      });
    });

    group('signOut', () {
      test('should clear auth store', () async {
        when(() => mockAuthStore.clear()).thenReturn(null);

        await authService.signOut();

        verify(() => mockAuthStore.clear()).called(1);
      });
    });

    group('currentUser', () {
      test('should return current user when authenticated', () {
        final mockUser =
            RecordModel({'id': 'user-123', 'email': 'test@example.com'});

        when(() => mockAuthStore.model).thenReturn(mockUser);

        final user = authService.currentUser;

        expect(user, isNotNull);
        expect(user?.id, equals('user-123'));
      });

      test('should return null when not authenticated', () {
        when(() => mockAuthStore.model).thenReturn(null);

        final user = authService.currentUser;

        expect(user, isNull);
      });
    });

    group('authStateChanges', () {
      test('should return auth store changes stream', () {
        final mockStream = Stream<AuthStoreEvent>.empty();

        when(() => mockAuthStore.onChange).thenAnswer((_) => mockStream);

        final stream = authService.authStateChanges;

        expect(stream, equals(mockStream));
      });
    });

    group('resetPassword', () {
      test('should request password reset successfully', () async {
        const email = 'test@example.com';

        when(() => mockRecordService.requestPasswordReset(email))
            .thenAnswer((_) async {});

        await authService.resetPassword(email: email);

        verify(() => mockRecordService.requestPasswordReset(email)).called(1);
      });

      test('should throw exception when request fails', () async {
        const email = 'test@example.com';

        when(() => mockRecordService.requestPasswordReset(email))
            .thenThrow(Exception('Request failed'));

        expect(
          () => authService.resetPassword(email: email),
          throwsException,
        );
      });
    });

    group('confirmPasswordReset', () {
      test('should confirm password reset successfully', () async {
        const token = 'reset-token-123';
        const password = 'new-password';

        when(() => mockRecordService.confirmPasswordReset(
            token, password, password)).thenAnswer((_) async {});

        await authService.confirmPasswordReset(
            token: token, password: password);

        verify(() => mockRecordService.confirmPasswordReset(
            token, password, password)).called(1);
      });

      test('should throw exception when confirmation fails', () async {
        const token = 'invalid-token';
        const password = 'new-password';

        when(() => mockRecordService.confirmPasswordReset(
            token, password, password)).thenThrow(Exception('Invalid token'));

        expect(
          () => authService.confirmPasswordReset(
              token: token, password: password),
          throwsException,
        );
      });
    });

    group('updatePassword', () {
      test('should update password when user is authenticated', () async {
        const password = 'new-password';
        final mockUser =
            RecordModel({'id': 'user-123', 'email': 'test@example.com'});

        when(() => mockAuthStore.model).thenReturn(mockUser);
        when(() => mockRecordService.update(
              'user-123',
              body: any(named: 'body'),
            )).thenAnswer((_) async => RecordModel({}));

        await authService.updatePassword(password: password);

        verify(() => mockRecordService.update(
              'user-123',
              body: any(named: 'body'),
            )).called(1);
      });

      test('should throw exception when user is not authenticated', () async {
        const password = 'new-password';

        when(() => mockAuthStore.model).thenReturn(null);

        expect(
          () => authService.updatePassword(password: password),
          throwsA(isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('No authenticated user'),
          )),
        );
      });
    });
  });
}
