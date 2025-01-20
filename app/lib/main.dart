import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'https://vqjwqemvsulfoyqmeikf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxandxZW12c3VsZm95cW1laWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjMxNDcsImV4cCI6MjA1Mjc5OTE0N30.LzSNgXkIGdoYzwJImC1NfOSqXeOVrf259LT5qptD0-Y',
    debug: true,
  );
  
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
    
    // Check if we're on a reset password route and have the access token
    if (uri.fragment.startsWith('reset-password') || uri.fragment.startsWith('/reset-password')) {
      print('Found reset-password fragment');
      // Extract the access token from the fragment
      final params = Uri.parse(uri.fragment).queryParameters;
      final accessToken = params['access_token'];
      final email = params['email'];
      print('Access token from fragment: $accessToken');
      print('Email from fragment: $email');
      
      if (accessToken != null && email != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          print('Navigating to reset password page with token and email');
          _navigatorKey.currentState?.pushNamed(
            AppConstants.resetPasswordRoute,
            arguments: {
              'access_token': accessToken,
              'email': email,
            },
          );
        });
      }
    }
  }

  void _handleUri(Uri uri) {
    print('Mobile deep link handler called with URI: ${uri.toString()}');
    if (!kIsWeb && uri.scheme == 'guru.mau.happyinvesting' && uri.host == 'reset-callback') {
      print('Found reset-callback URI');
      // Extract the tokens from the fragment
      final fragment = uri.fragment;
      final fragmentParams = Uri.parse('dummy://dummy?' + fragment).queryParameters;
      final accessToken = fragmentParams['access_token'];
      final refreshToken = fragmentParams['refresh_token'];
      final email = fragmentParams['email'];
      print('Access token from fragment: $accessToken');
      print('Refresh token from fragment: $refreshToken');
      print('Email from fragment: $email');
      
      if (accessToken != null && refreshToken != null && email != null) {
        _navigatorKey.currentState?.pushNamed(
          AppConstants.resetPasswordRoute,
          arguments: {
            'access_token': accessToken,
            'refresh_token': refreshToken,
            'email': email,
          },
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