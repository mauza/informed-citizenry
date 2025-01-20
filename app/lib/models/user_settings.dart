class UserSettings {
  final String? id;
  final String userId;
  final double monthlyIncome;
  final double monthlyExpenses;
  final double savingsGoal;
  final DateTime updatedAt;

  UserSettings({
    this.id,
    required this.userId,
    required this.monthlyIncome,
    required this.monthlyExpenses,
    required this.savingsGoal,
    required this.updatedAt,
  });

  double get currentSavings => monthlyIncome - monthlyExpenses;
  bool get isReachingGoal => currentSavings >= savingsGoal;

  factory UserSettings.fromJson(Map<String, dynamic> json) {
    return UserSettings(
      id: json['id'],
      userId: json['user_id'],
      monthlyIncome: json['monthly_income'].toDouble(),
      monthlyExpenses: json['monthly_expenses'].toDouble(),
      savingsGoal: json['savings_goal'].toDouble(),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'monthly_income': monthlyIncome,
      'monthly_expenses': monthlyExpenses,
      'savings_goal': savingsGoal,
      'updated_at': updatedAt.toIso8601String(),
    };
  }
} 