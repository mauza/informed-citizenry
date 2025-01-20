class UserProfile {
  final String? id;
  final String userId;
  final String? firstName;
  final String? lastName;
  final DateTime? birthdate;
  final String? streetAddress;
  final String? city;
  final String? state;
  final String? zipCode;
  final String? phoneNumber;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    this.id,
    required this.userId,
    this.firstName,
    this.lastName,
    this.birthdate,
    this.streetAddress,
    this.city,
    this.state,
    this.zipCode,
    this.phoneNumber,
    required this.createdAt,
    required this.updatedAt,
  });

  String? get fullName {
    if (firstName == null && lastName == null) return null;
    return [firstName, lastName].where((e) => e != null).join(' ');
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'],
      userId: json['user_id'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      birthdate: json['birthdate'] != null ? DateTime.parse(json['birthdate']) : null,
      streetAddress: json['street_address'],
      city: json['city'],
      state: json['state'],
      zipCode: json['zip_code'],
      phoneNumber: json['phone_number'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      if (firstName != null) 'first_name': firstName,
      if (lastName != null) 'last_name': lastName,
      if (birthdate != null) 'birthdate': birthdate!.toIso8601String().split('T')[0],
      if (streetAddress != null) 'street_address': streetAddress,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (zipCode != null) 'zip_code': zipCode,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
} 