import 'package:flutter/material.dart';
import 'package:pocketbase/pocketbase.dart';
import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:informed_citizenry_app/screens/home_page.dart';
import 'package:informed_citizenry_app/screens/login_page.dart';
import 'package:informed_citizenry_app/screens/profile_page.dart';
import 'package:informed_citizenry_app/screens/reset_password_page.dart';
import 'package:informed_citizenry_app/screens/sign_up_page.dart';
import 'package:informed_citizenry_app/screens/verify_email_page.dart';
import 'package:informed_citizenry_app/utils/constants.dart';
import 'package:informed_citizenry_app/utils/theme.dart';

// Global PocketBase instance
late final PocketBase pb;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize PocketBase
  // For production, use your actual PocketBase URL
  const pbUrl = String.fromEnvironment(
    'PB_URL',
    defaultValue: 'http://localhost:8090',
  );
  pb = PocketBase(pbUrl);

  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  late AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    _initDeepLinking();
  }

  Future<void> _initDeepLinking() async {
    if (!kIsWeb) {
      _appLinks = AppLinks();

      // Handle initial URI
      final uri = await _appLinks.getInitialLink();
      if (uri != null) {
        _handleUri(uri);
      }

      // Handle incoming links
      _appLinks.uriLinkStream.listen((uri) {
        _handleUri(uri);
      });
    } else {
      _handleWebDeepLink();
    }
  }

  void _handleWebDeepLink() {
    // Get the current URL
    final uri = Uri.base;
    print('Web deep link handler called with URI: ${uri.toString()}');

    // Check if we're on a reset password route and have the token
    if (uri.fragment.startsWith('reset-password') ||
        uri.fragment.startsWith('/reset-password')) {
      print('Found reset-password fragment');
      // Extract the token from the fragment
      final params = Uri.parse(uri.fragment).queryParameters;
      final token = params['token'];
      final email = params['email'];
      print('Token from fragment: $token');
      print('Email from fragment: $email');

      if (token != null && email != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          print('Navigating to reset password page with token and email');
          _navigatorKey.currentState?.pushNamed(
            AppConstants.resetPasswordRoute,
            arguments: {'token': token, 'email': email},
          );
        });
      }
    }
  }

  void _handleUri(Uri uri) {
    print('Mobile deep link handler called with URI: ${uri.toString()}');
    if (!kIsWeb &&
        uri.scheme == 'guru.mau.happyinvesting' &&
        uri.host == 'reset-callback') {
      print('Found reset-callback URI');
      // Extract the token from the query parameters
      final token = uri.queryParameters['token'];
      final email = uri.queryParameters['email'];
      print('Token from query: $token');
      print('Email from query: $email');

      if (token != null && email != null) {
        _navigatorKey.currentState?.pushNamed(
          AppConstants.resetPasswordRoute,
          arguments: {'token': token, 'email': email},
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: AppConstants.appName,
      theme: AppTheme.theme,
      initialRoute: AppConstants.loginRoute,
      routes: {
        AppConstants.homeRoute: (context) => HomePage(),
        AppConstants.loginRoute: (context) => LoginPage(),
        AppConstants.signUpRoute: (context) => SignUpPage(),
        AppConstants.profileRoute: (context) => ProfilePage(),
        AppConstants.resetPasswordRoute: (context) => ResetPasswordPage(),
        AppConstants.verifyEmailRoute: (context) => VerifyEmailPage(),
      },
    );
  }
}
