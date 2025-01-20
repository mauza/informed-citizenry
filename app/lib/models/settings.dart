class Settings {
  final String? id;
  final String userId;
  final bool notificationEnabled;
  final String themePreference;
  final DateTime createdAt;
  final DateTime updatedAt;

  Settings({
    this.id,
    required this.userId,
    required this.notificationEnabled,
    required this.themePreference,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Settings.fromJson(Map<String, dynamic> json) {
    return Settings(
      id: json['id'],
      userId: json['user_id'],
      notificationEnabled: json['notification_enabled'] ?? true,
      themePreference: json['theme_preference'] ?? 'system',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'notification_enabled': notificationEnabled,
      'theme_preference': themePreference,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
} 