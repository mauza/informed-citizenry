import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      primarySwatch: Colors.teal,
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF00BCD4), // Calming aqua as primary
        secondary: Color(0xFFFFB74D), // Warm orange as secondary
        tertiary: Color(0xFF2E7D32), // Forest green as accent
        surface: Colors.white,
        onPrimary: Colors.white,
        onSecondary: Colors.black87,
        onSurface: Colors.black87,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Color(0xFF00BCD4),
          foregroundColor: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
} 