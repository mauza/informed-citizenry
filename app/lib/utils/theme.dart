import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      primarySwatch: Colors.blue,
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF1B3157),    // Deep navy blue
        secondary: Color(0xFF8B2635),   // Muted burgundy red
        tertiary: Color(0xFF4A4A4A),    // Slate gray
        surface: Color(0xFFF5F1E9),     // Warm cream
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: Color(0xFF2C2C2C),   // Dark gray for text
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Color(0xFF1B3157),  // Deep navy blue
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