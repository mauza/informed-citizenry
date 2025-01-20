import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SettingsForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController monthlyIncomeController;
  final TextEditingController monthlyExpensesController;
  final TextEditingController savingsGoalController;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  const SettingsForm({
    Key? key,
    required this.formKey,
    required this.monthlyIncomeController,
    required this.monthlyExpensesController,
    required this.savingsGoalController,
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
          TextFormField(
            controller: monthlyIncomeController,
            decoration: InputDecoration(
              labelText: 'Monthly Income',
              prefixText: '\$',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
            ],
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your monthly income';
              }
              return null;
            },
          ),
          SizedBox(height: 16),
          TextFormField(
            controller: monthlyExpensesController,
            decoration: InputDecoration(
              labelText: 'Monthly Expenses',
              prefixText: '\$',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
            ],
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your monthly expenses';
              }
              return null;
            },
          ),
          SizedBox(height: 16),
          TextFormField(
            controller: savingsGoalController,
            decoration: InputDecoration(
              labelText: 'Monthly Savings Goal',
              prefixText: '\$',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
            ],
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your savings goal';
              }
              return null;
            },
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