abstract class ISettingsService {
  Future<Map<String, dynamic>?> getUserSettings(String userId);

  Future<void> upsertUserSettings({
    required String? id,
    required String userId,
    required double monthlyIncome,
    required double monthlyExpenses,
    required double savingsGoal,
  });
} 