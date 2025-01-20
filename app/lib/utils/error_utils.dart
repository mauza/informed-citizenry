import 'package:supabase_flutter/supabase_flutter.dart';

class ErrorUtils {
  static String getErrorMessage(dynamic error) {
    if (error is AuthException) {
      return error.message;
    } else if (error is PostgrestException) {
      return 'Database error: ${error.message}';
    } else {
      return error.toString();
    }
  }

  static bool isNetworkError(dynamic error) {
    final message = error.toString().toLowerCase();
    return message.contains('network') || 
           message.contains('connection') ||
           message.contains('timeout');
  }

  static bool isAuthError(dynamic error) {
    return error is AuthException ||
           error.toString().toLowerCase().contains('authentication');
  }

  static bool isValidationError(dynamic error) {
    return error.toString().toLowerCase().contains('validation') ||
           error.toString().toLowerCase().contains('invalid');
  }
} 