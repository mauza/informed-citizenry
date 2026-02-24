import 'package:pocketbase/pocketbase.dart';

class ErrorUtils {
  static String getErrorMessage(dynamic error) {
    if (error is ClientException) {
      return error.response['message'] ??
          error.originalError?.toString() ??
          'An error occurred';
    } else {
      return error.toString();
    }
  }

  static bool isNetworkError(dynamic error) {
    final message = error.toString().toLowerCase();
    return message.contains('network') ||
        message.contains('connection') ||
        message.contains('timeout') ||
        message.contains('socket');
  }

  static bool isAuthError(dynamic error) {
    if (error is ClientException) {
      final status = error.statusCode;
      return status == 401 || status == 403;
    }
    return error.toString().toLowerCase().contains('authentication');
  }

  static bool isValidationError(dynamic error) {
    if (error is ClientException) {
      return error.statusCode == 400 ||
          (error.response['data'] != null && error.response['data'] is Map);
    }
    return error.toString().toLowerCase().contains('validation') ||
        error.toString().toLowerCase().contains('invalid');
  }
}
