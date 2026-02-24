import 'package:flutter_test/flutter_test.dart';
import 'package:informed_citizenry_app/utils/error_utils.dart';
import 'package:pocketbase/pocketbase.dart';

void main() {
  group('ErrorUtils Tests', () {
    group('getErrorMessage', () {
      test('should extract message from ClientException', () {
        final exception = ClientException(
          statusCode: 400,
          response: {'message': 'Invalid credentials'},
        );

        final message = ErrorUtils.getErrorMessage(exception);

        expect(message, equals('Invalid credentials'));
      });

      test('should return originalError when message is missing', () {
        final originalError = Exception('Original error');
        final exception = ClientException(
          statusCode: 500,
          response: {},
          originalError: originalError,
        );

        final message = ErrorUtils.getErrorMessage(exception);

        expect(message, contains('Original error'));
      });

      test(
        'should return default message when ClientException has no details',
        () {
          final exception = ClientException(statusCode: 400, response: {});

          final message = ErrorUtils.getErrorMessage(exception);

          expect(message, equals('An error occurred'));
        },
      );

      test('should convert non-ClientException to string', () {
        final error = Exception('Generic error');

        final message = ErrorUtils.getErrorMessage(error);

        expect(message, contains('Generic error'));
      });
    });

    group('isNetworkError', () {
      test('should detect network in error message', () {
        final error = Exception('Network error occurred');

        expect(ErrorUtils.isNetworkError(error), isTrue);
      });

      test('should detect connection in error message', () {
        final error = Exception('Connection refused');

        expect(ErrorUtils.isNetworkError(error), isTrue);
      });

      test('should detect timeout in error message', () {
        final error = Exception('Request timeout');

        expect(ErrorUtils.isNetworkError(error), isTrue);
      });

      test('should detect socket in error message', () {
        final error = Exception('Socket exception');

        expect(ErrorUtils.isNetworkError(error), isTrue);
      });

      test('should return false for non-network errors', () {
        final error = Exception('Invalid input');

        expect(ErrorUtils.isNetworkError(error), isFalse);
      });
    });

    group('isAuthError', () {
      test('should detect 401 status code as auth error', () {
        final exception = ClientException(statusCode: 401, response: {});

        expect(ErrorUtils.isAuthError(exception), isTrue);
      });

      test('should detect 403 status code as auth error', () {
        final exception = ClientException(statusCode: 403, response: {});

        expect(ErrorUtils.isAuthError(exception), isTrue);
      });

      test('should return false for other status codes', () {
        final exception = ClientException(statusCode: 500, response: {});

        expect(ErrorUtils.isAuthError(exception), isFalse);
      });

      test('should detect authentication in error message', () {
        final error = Exception('Authentication failed');

        expect(ErrorUtils.isAuthError(error), isTrue);
      });

      test('should return false for non-auth errors', () {
        final error = Exception('Database error');

        expect(ErrorUtils.isAuthError(error), isFalse);
      });
    });

    group('isValidationError', () {
      test('should detect 400 status code as validation error', () {
        final exception = ClientException(statusCode: 400, response: {});

        expect(ErrorUtils.isValidationError(exception), isTrue);
      });

      test('should detect response data as validation error', () {
        final exception = ClientException(
          statusCode: 422,
          response: {
            'data': {'field': 'error'},
          },
        );

        expect(ErrorUtils.isValidationError(exception), isTrue);
      });

      test('should return false for non-validation ClientException', () {
        final exception = ClientException(statusCode: 500, response: {});

        expect(ErrorUtils.isValidationError(exception), isFalse);
      });

      test('should detect validation in error message', () {
        final error = Exception('Validation failed');

        expect(ErrorUtils.isValidationError(error), isTrue);
      });

      test('should detect invalid in error message', () {
        final error = Exception('Invalid input');

        expect(ErrorUtils.isValidationError(error), isTrue);
      });

      test('should return false for non-validation errors', () {
        final error = Exception('Server error');

        expect(ErrorUtils.isValidationError(error), isFalse);
      });
    });
  });
}
