import 'package:flutter/material.dart';

class AppSettingsForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final bool notificationEnabled;
  final String themePreference;
  final Function(bool) onNotificationChanged;
  final Function(String) onThemeChanged;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  const AppSettingsForm({
    Key? key,
    required this.formKey,
    required this.notificationEnabled,
    required this.themePreference,
    required this.onNotificationChanged,
    required this.onThemeChanged,
    required this.onSave,
    required this.onCancel,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Notifications',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  SwitchListTile(
                    title: Text('Enable Notifications'),
                    subtitle: Text('Receive updates about new bills and votes'),
                    value: notificationEnabled,
                    onChanged: onNotificationChanged,
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Theme',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  RadioListTile<String>(
                    title: Text('System'),
                    value: 'system',
                    groupValue: themePreference,
                    onChanged: (value) => onThemeChanged(value!),
                  ),
                  RadioListTile<String>(
                    title: Text('Light'),
                    value: 'light',
                    groupValue: themePreference,
                    onChanged: (value) => onThemeChanged(value!),
                  ),
                  RadioListTile<String>(
                    title: Text('Dark'),
                    value: 'dark',
                    groupValue: themePreference,
                    onChanged: (value) => onThemeChanged(value!),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onCancel,
                  child: Text('Cancel'),
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: onSave,
                  child: Text('Save'),
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
} 