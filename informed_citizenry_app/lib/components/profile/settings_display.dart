import 'package:flutter/material.dart';
import 'package:informed_citizenry_app/components/profile/info_card.dart';
import 'package:informed_citizenry_app/models/user_settings.dart';

class SettingsDisplay extends StatelessWidget {
  final UserSettings? settings;
  final VoidCallback onEdit;

  const SettingsDisplay({
    Key? key,
    required this.settings,
    required this.onEdit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (settings == null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'No settings found. Click edit to set up your profile.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
          SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onEdit,
            icon: Icon(Icons.edit),
            label: Text('Set Up Profile'),
            style: ElevatedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: InfoCard(
                title: 'Monthly Income',
                value: settings!.monthlyIncome.toStringAsFixed(2),
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: InfoCard(
                title: 'Monthly Expenses',
                value: settings!.monthlyExpenses.toStringAsFixed(2),
                valueColor: Theme.of(context).colorScheme.secondary,
              ),
            ),
          ],
        ),
        SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: InfoCard(
                title: 'Current Savings',
                value: settings!.currentSavings.toStringAsFixed(2),
                valueColor: settings!.isReachingGoal ? Colors.green : Colors.orange,
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: InfoCard(
                title: 'Savings Goal',
                value: settings!.savingsGoal.toStringAsFixed(2),
                valueColor: Theme.of(context).colorScheme.tertiary,
              ),
            ),
          ],
        ),
        SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: onEdit,
          icon: Icon(Icons.edit),
          label: Text('Edit Settings'),
          style: ElevatedButton.styleFrom(
            padding: EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      ],
    );
  }
} 