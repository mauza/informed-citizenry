// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. For WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:informed_citizenry_app/main.dart';
import 'package:informed_citizenry_app/screens/login_page.dart';

void main() {
  group('MyApp Widget Tests', () {
    testWidgets('MyApp builds successfully with MaterialApp', (
      WidgetTester tester,
    ) async {
      // Build our app and trigger a frame
      await tester.pumpWidget(MyApp());

      // Verify that MaterialApp is present
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    testWidgets('LoginPage is the initial route', (WidgetTester tester) async {
      // Build our app
      await tester.pumpWidget(MyApp());
      await tester.pumpAndSettle();

      // Verify that LoginPage is displayed (initial route)
      expect(find.byType(LoginPage), findsOneWidget);
    });

    testWidgets('App has correct title', (WidgetTester tester) async {
      // Build our app
      await tester.pumpWidget(MyApp());

      // Find MaterialApp and verify title
      final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));
      expect(materialApp.title, 'Informed Citizenry');
    });
  });
}
