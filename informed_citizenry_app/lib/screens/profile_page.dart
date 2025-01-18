import 'package:flutter/material.dart';
import 'package:informed_citizenry_app/components/common/error_display.dart';
import 'package:informed_citizenry_app/components/common/loading_state.dart';
import 'package:informed_citizenry_app/components/profile/app_settings_form.dart';
import 'package:informed_citizenry_app/components/profile/profile_form.dart';
import 'package:informed_citizenry_app/models/settings.dart';
import 'package:informed_citizenry_app/models/user_profile.dart';
import 'package:informed_citizenry_app/services/auth_service.dart';
import 'package:informed_citizenry_app/services/settings_service.dart';
import 'package:informed_citizenry_app/utils/constants.dart';
import 'package:informed_citizenry_app/utils/snackbar_utils.dart';

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _profileFormKey = GlobalKey<FormState>();
  final _settingsFormKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _streetAddressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _zipCodeController = TextEditingController();
  final _phoneNumberController = TextEditingController();
  final _authService = AuthService();
  final _settingsService = SettingsService();
  
  bool _isLoading = true;
  bool _isEditingProfile = false;
  bool _isEditingSettings = false;
  bool _isNewUser = false;
  DateTime? _selectedBirthdate;
  UserProfile? _currentProfile;
  Settings? _currentSettings;
  bool _notificationEnabled = true;
  String _themePreference = 'system';
  dynamic _error;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _streetAddressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _zipCodeController.dispose();
    _phoneNumberController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    if (!mounted) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userId = _authService.currentUser!.id;
      final profileResponse = await _settingsService.getUserProfile(userId);
      final settingsResponse = await _settingsService.getUserSettings(userId);
      
      if (mounted) {
        if (profileResponse == null && settingsResponse == null) {
          setState(() {
            _isNewUser = true;
            _isEditingProfile = true;
            _isEditingSettings = true;
            _isLoading = false;
          });
        } else {
          setState(() {
            _currentProfile = profileResponse;
            _currentSettings = settingsResponse;
            
            // Initialize profile form controllers
            _firstNameController.text = _currentProfile?.firstName ?? '';
            _lastNameController.text = _currentProfile?.lastName ?? '';
            _streetAddressController.text = _currentProfile?.streetAddress ?? '';
            _cityController.text = _currentProfile?.city ?? '';
            _stateController.text = _currentProfile?.state ?? '';
            _zipCodeController.text = _currentProfile?.zipCode ?? '';
            _phoneNumberController.text = _currentProfile?.phoneNumber ?? '';
            _selectedBirthdate = _currentProfile?.birthdate;
            
            // Initialize settings
            _notificationEnabled = _currentSettings?.notificationEnabled ?? true;
            _themePreference = _currentSettings?.themePreference ?? 'system';
            
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

  Future<void> _saveProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;

    try {
      final userId = _authService.currentUser!.id;
      await _settingsService.upsertUserProfile(
        id: _currentProfile?.id,
        userId: userId,
        firstName: _firstNameController.text.isEmpty ? null : _firstNameController.text,
        lastName: _lastNameController.text.isEmpty ? null : _lastNameController.text,
        birthdate: _selectedBirthdate,
        streetAddress: _streetAddressController.text.isEmpty ? null : _streetAddressController.text,
        city: _cityController.text.isEmpty ? null : _cityController.text,
        state: _stateController.text.isEmpty ? null : _stateController.text,
        zipCode: _zipCodeController.text.isEmpty ? null : _zipCodeController.text,
        phoneNumber: _phoneNumberController.text.isEmpty ? null : _phoneNumberController.text,
      );

      await _loadUserData();
      setState(() {
        _isEditingProfile = false;
      });
      
      if (mounted) {
        SnackbarUtils.showSuccess(context, 'Profile saved successfully');
      }
    } catch (error) {
      if (mounted) {
        SnackbarUtils.showError(context, error);
      }
    }
  }

  Future<void> _saveSettings() async {
    if (!_settingsFormKey.currentState!.validate()) return;

    try {
      final userId = _authService.currentUser!.id;
      await _settingsService.upsertSettings(
        id: _currentSettings?.id,
        userId: userId,
        notificationEnabled: _notificationEnabled,
        themePreference: _themePreference,
      );

      await _loadUserData();
      setState(() {
        _isEditingSettings = false;
      });
      
      if (mounted) {
        SnackbarUtils.showSuccess(context, AppConstants.settingsSaved);
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

  Widget _buildProfileSection() {
    if (_isEditingProfile) {
      return ProfileForm(
        formKey: _profileFormKey,
        firstNameController: _firstNameController,
        lastNameController: _lastNameController,
        streetAddressController: _streetAddressController,
        cityController: _cityController,
        stateController: _stateController,
        zipCodeController: _zipCodeController,
        phoneNumberController: _phoneNumberController,
        selectedBirthdate: _selectedBirthdate,
        onBirthdateChanged: (date) => setState(() => _selectedBirthdate = date),
        onSave: _saveProfile,
        onCancel: () => setState(() => _isEditingProfile = false),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Profile Information',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  icon: Icon(Icons.edit),
                  onPressed: () => setState(() => _isEditingProfile = true),
                ),
              ],
            ),
            Divider(),
            if (_currentProfile?.fullName != null) ...[
              ListTile(
                leading: Icon(Icons.person),
                title: Text('Name'),
                subtitle: Text(_currentProfile!.fullName!),
              ),
            ],
            if (_currentProfile?.birthdate != null) ...[
              ListTile(
                leading: Icon(Icons.cake),
                title: Text('Birthdate'),
                subtitle: Text(
                  '${_currentProfile!.birthdate!.month}/${_currentProfile!.birthdate!.day}/${_currentProfile!.birthdate!.year}',
                ),
              ),
            ],
            if (_currentProfile?.streetAddress != null) ...[
              ListTile(
                leading: Icon(Icons.home),
                title: Text('Address'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_currentProfile!.streetAddress!),
                    if (_currentProfile?.city != null || _currentProfile?.state != null || _currentProfile?.zipCode != null)
                      Text([
                        _currentProfile?.city,
                        _currentProfile?.state,
                        _currentProfile?.zipCode,
                      ].where((e) => e != null).join(', ')),
                  ],
                ),
              ),
            ],
            if (_currentProfile?.phoneNumber != null) ...[
              ListTile(
                leading: Icon(Icons.phone),
                title: Text('Phone'),
                subtitle: Text(_currentProfile!.phoneNumber!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsSection() {
    if (_isEditingSettings) {
      return AppSettingsForm(
        formKey: _settingsFormKey,
        notificationEnabled: _notificationEnabled,
        themePreference: _themePreference,
        onNotificationChanged: (value) => setState(() => _notificationEnabled = value),
        onThemeChanged: (value) => setState(() => _themePreference = value),
        onSave: _saveSettings,
        onCancel: () => setState(() => _isEditingSettings = false),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'App Settings',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  icon: Icon(Icons.edit),
                  onPressed: () => setState(() => _isEditingSettings = true),
                ),
              ],
            ),
            Divider(),
            ListTile(
              leading: Icon(Icons.notifications),
              title: Text('Notifications'),
              subtitle: Text(_notificationEnabled ? 'Enabled' : 'Disabled'),
            ),
            ListTile(
              leading: Icon(Icons.palette),
              title: Text('Theme'),
              subtitle: Text(_themePreference.substring(0, 1).toUpperCase() + _themePreference.substring(1)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isNewUser ? 'Complete Your Profile' : 'Profile & Settings'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _signOut,
          ),
        ],
      ),
      body: _isLoading
          ? LoadingState(message: 'Loading your profile...')
          : _error != null
              ? ErrorDisplay(
                  error: _error,
                  onRetry: _loadUserData,
                )
              : SingleChildScrollView(
                  child: Center(
                    child: Container(
                      constraints: BoxConstraints(maxWidth: 600),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_isNewUser) ...[
                              Icon(
                                Icons.waving_hand,
                                size: 64,
                                color: Theme.of(context).primaryColor,
                              ),
                              SizedBox(height: 24),
                              Text(
                                'Welcome to Informed Citizenry!',
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).primaryColor,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              SizedBox(height: 16),
                              Text(
                                'Let\'s set up your profile and preferences.',
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: Colors.grey[700],
                                ),
                                textAlign: TextAlign.center,
                              ),
                              SizedBox(height: 32),
                            ],
                            _buildProfileSection(),
                            SizedBox(height: 24),
                            _buildSettingsSection(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
    );
  }
} 