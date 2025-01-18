import 'package:flutter/material.dart';
import 'package:informed_citizenry_app/components/common/error_display.dart';
import 'package:informed_citizenry_app/components/common/loading_state.dart';
import 'package:informed_citizenry_app/components/profile/profile_header.dart';
import 'package:informed_citizenry_app/components/profile/settings_display.dart';
import 'package:informed_citizenry_app/components/profile/settings_form.dart';
import 'package:informed_citizenry_app/models/user_settings.dart';
import 'package:informed_citizenry_app/services/auth_service.dart';
import 'package:informed_citizenry_app/services/settings_service.dart';
import 'package:informed_citizenry_app/utils/constants.dart';
import 'package:informed_citizenry_app/utils/snackbar_utils.dart';

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _monthlyIncomeController = TextEditingController();
  final _monthlyExpensesController = TextEditingController();
  final _savingsGoalController = TextEditingController();
  final _authService = AuthService();
  final _settingsService = SettingsService();
  bool _isLoading = true;
  bool _isEditing = false;
  bool _isNewUser = false;
  UserSettings? _currentSettings;
  dynamic _error;

  @override
  void initState() {
    super.initState();
    _loadUserSettings();
  }

  @override
  void dispose() {
    _monthlyIncomeController.dispose();
    _monthlyExpensesController.dispose();
    _savingsGoalController.dispose();
    super.dispose();
  }

  Future<void> _loadUserSettings() async {
    if (!mounted) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userId = _authService.currentUser!.id;
      final response = await _settingsService.getUserSettings(userId);
      
      if (mounted) {
        if (response == null) {
          // New user without settings
          setState(() {
            _isNewUser = true;
            _isEditing = true;
            _monthlyIncomeController.text = '0';
            _monthlyExpensesController.text = '0';
            _savingsGoalController.text = '0';
            _isLoading = false;
          });
        } else {
          setState(() {
            _currentSettings = UserSettings.fromJson(response);
            _monthlyIncomeController.text = _currentSettings!.monthlyIncome.toString();
            _monthlyExpensesController.text = _currentSettings!.monthlyExpenses.toString();
            _savingsGoalController.text = _currentSettings!.savingsGoal.toString();
            _isLoading = false;
          });
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      final userId = _authService.currentUser!.id;
      await _settingsService.upsertUserSettings(
        id: _currentSettings?.id,
        userId: userId,
        monthlyIncome: double.parse(_monthlyIncomeController.text),
        monthlyExpenses: double.parse(_monthlyExpensesController.text),
        savingsGoal: double.parse(_savingsGoalController.text),
      );

      await _loadUserSettings();
      setState(() {
        _isEditing = false;
        _isNewUser = false;
      });
      
      if (mounted) {
        SnackbarUtils.showSuccess(context, _currentSettings == null 
          ? 'Welcome! Your settings have been saved.'
          : AppConstants.settingsSaved);
      }
    } catch (error) {
      if (mounted) {
        SnackbarUtils.showError(context, error);
      }
    }
  }

  Future<void> _signOut() async {
    try {
      await _authService.signOut();
      if (mounted) {
        Navigator.pushReplacementNamed(context, AppConstants.loginRoute);
      }
    } catch (error) {
      if (mounted) {
        SnackbarUtils.showError(context, error);
      }
    }
  }

  Widget _buildWelcomeSetup() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(
          Icons.waving_hand,
          size: 64,
          color: Theme.of(context).primaryColor,
        ),
        SizedBox(height: 24),
        Text(
          'Welcome to Happy Investing!',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).primaryColor,
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 16),
        Text(
          'Let\'s set up your financial goals to get started.',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: Colors.grey[700],
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: 32),
        SettingsForm(
          formKey: _formKey,
          monthlyIncomeController: _monthlyIncomeController,
          monthlyExpensesController: _monthlyExpensesController,
          savingsGoalController: _savingsGoalController,
          onSave: _saveSettings,
          onCancel: () {},
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isNewUser ? 'Welcome Setup' : 'Profile Settings'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _signOut,
          ),
        ],
      ),
      body: _isLoading
          ? LoadingState(message: 'Loading your settings...')
          : _error != null
              ? ErrorDisplay(
                  error: _error,
                  onRetry: _loadUserSettings,
                )
              : SingleChildScrollView(
                  child: Center(
                    child: Container(
                      constraints: BoxConstraints(maxWidth: 600),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: _isNewUser
                            ? _buildWelcomeSetup()
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  ProfileHeader(),
                                  _isEditing
                                      ? SettingsForm(
                                          formKey: _formKey,
                                          monthlyIncomeController: _monthlyIncomeController,
                                          monthlyExpensesController: _monthlyExpensesController,
                                          savingsGoalController: _savingsGoalController,
                                          onSave: _saveSettings,
                                          onCancel: () => setState(() => _isEditing = false),
                                        )
                                      : SettingsDisplay(
                                          settings: _currentSettings,
                                          onEdit: () => setState(() => _isEditing = true),
                                        ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ),
    );
  }
} 