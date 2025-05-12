# API REST - Restaurant - Documentation

## Table des matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Utilisateurs](#utilisateurs)
4. [Tables](#tables)
5. [Réservations](#réservations)
6. [Menu](#menu)
7. [Disponibilité](#disponibilité)
8. [Modèles de données](#modèles-de-données)

## Introduction

Cette API REST constitue le backend d'une application de réservation de restaurant. Elle permet la gestion des utilisateurs, des tables, des réservations, du menu et des horaires d'ouverture.

### Configuration technique

- **Framework**: Express.js
- **Base de données**: MySQL (via Sequelize ORM)
- **Authentification**: JWT (JSON Web Tokens)

### Installation

```bash
# Cloner le repository
git clone <https://github.com/Driikzz/TpRestaurant.git>

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env
# Éditer le fichier .env avec vos informations de base de données

# Démarrer le serveur
npm run dev
```

## Authentification

L'authentification utilise JSON Web Tokens (JWT).

### Endpoints d'authentification

#### Inscription

```
POST /api/auth/signup
```

Corps de la requête:
```json
{
  "email": "utilisateur@exemple.com",
  "password": "motdepasse123",
  "firstname": "Jean",
  "lastname": "Dupont",
  "phone": "0612345678"
}
```

Réponse (201 Created):
```json
{
  "message": "Compte créé",
  "userId": 1
}
```

#### Connexion

```
POST /api/auth/login
```

Corps de la requête:
```json
{
  "email": "utilisateur@exemple.com",
  "password": "motdepasse123"
}
```

Réponse (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Middleware d'authentification

Pour les routes protégées, vous devez inclure le JWT dans l'en-tête Authorization:

```
Authorization: Bearer <votre_token_jwt>
```

## Utilisateurs

Les informations sur les utilisateurs sont gérées via le modèle User.

Rôles disponibles:
- `client` (défaut)
- `admin`

## Tables

Les tables du restaurant peuvent être gérées uniquement par les administrateurs.

### Endpoints des tables

#### Obtenir toutes les tables

```
GET /api/tables
```

Authentification requise

Réponse (200 OK):
```json
[
  {
    "id": 1,
    "name": "Table Romantique",
    "seats": 2,
    "location": "Terrasse"
  },
  {
    "id": 2,
    "name": "Grande Table",
    "seats": 6,
    "location": "Intérieur"
  }
]
```

#### Créer une table (admin)

```
POST /api/tables
```

Authentification requise (admin)

Corps de la requête:
```json
{
  "name": "Table Fenêtre",
  "seats": 4,
  "location": "Près de la fenêtre"
}
```

Réponse (201 Created):
```json
{
  "message": "Table créée",
  "table": {
    "id": 3,
    "name": "Table Fenêtre",
    "seats": 4,
    "location": "Près de la fenêtre"
  }
}
```

#### Mettre à jour une table (admin)

```
PUT /api/tables/:id
```

Authentification requise (admin)

Corps de la requête:
```json
{
  "name": "Table VIP",
  "seats": 4,
  "location": "Salon privé"
}
```

Réponse (200 OK):
```json
{
  "message": "Table modifiée",
  "table": {
    "id": 3,
    "name": "Table VIP",
    "seats": 4,
    "location": "Salon privé"
  }
}
```

#### Supprimer une table (admin)

```
DELETE /api/tables/:id
```

Authentification requise (admin)

Réponse (200 OK):
```json
{
  "message": "Table supprimée"
}
```

#### Obtenir les tables disponibles

```
GET /api/tables/available?date=2024-03-20&time=19:30&number_of_people=4
```

Authentification requise

Réponse (200 OK):
```json
{
  "available": true,
  "tables": [
    {
      "id": 1,
      "name": "Table Romantique",
      "seats": 2,
      "location": "Terrasse"
    },
    {
      "id": 3,
      "name": "Table VIP",
      "seats": 4,
      "location": "Salon privé"
    }
  ],
  "tableAssignment": [
    {
      "id": 3,
      "name": "Table VIP",
      "seats": 4,
      "location": "Salon privé"
    }
  ]
}
```

## Réservations

### Endpoints des réservations

#### Obtenir toutes les réservations (admin)

```
GET /api/reservations
```

Authentification requise (admin)

Réponse (200 OK):
```json
[
  {
    "id": 1,
    "user_id": 2,
    "number_of_people": 4,
    "date": "2024-03-20",
    "time": "19:30:00",
    "note": "Près d'une fenêtre si possible",
    "status": "confirmed",
    "User": {
      "id": 2,
      "firstname": "Jean",
      "lastname": "Dupont"
    },
    "Tables": [
      {
        "id": 3,
        "name": "Table VIP",
        "seats": 4
      }
    ]
  }
]
```

#### Obtenir mes réservations

```
GET /api/reservations/my-reservations
```

Authentification requise

Réponse (200 OK):
```json
[
  {
    "id": 1,
    "number_of_people": 4,
    "date": "2024-03-20",
    "time": "19:30:00",
    "note": "Près d'une fenêtre si possible",
    "status": "confirmed",
    "Tables": [
      {
        "id": 3,
        "name": "Table VIP",
        "seats": 4
      }
    ]
  }
]
```

#### Créer une réservation

```
POST /api/reservations
```

Authentification requise

Corps de la requête:
```json
{
  "number_of_people": 4,
  "date": "2024-03-22",
  "time": "20:00:00",
  "note": "Anniversaire"
}
```

Réponse (201 Created):
```json
{
  "message": "Réservation enregistrée",
  "reservation": {
    "id": 2,
    "user_id": 2,
    "number_of_people": 4,
    "date": "2024-03-22",
    "time": "20:00:00",
    "note": "Anniversaire",
    "status": "pending"
  },
  "tables": [
    {
      "id": 3,
      "name": "Table VIP",
      "seats": 4
    }
  ]
}
```

#### Mettre à jour une réservation

```
PUT /api/reservations/:id
```

Authentification requise

Corps de la requête:
```json
{
  "number_of_people": 6,
  "date": "2024-03-22",
  "time": "20:30:00",
  "note": "Anniversaire avec deux personnes en plus"
}
```

Réponse (200 OK):
```json
{
  "message": "Modifiée",
  "reservation": {
    "id": 2,
    "number_of_people": 6,
    "date": "2024-03-22",
    "time": "20:30:00",
    "note": "Anniversaire avec deux personnes en plus",
    "status": "pending"
  }
}
```

#### Supprimer une réservation

```
DELETE /api/reservations/:id
```

Authentification requise

Réponse (200 OK):
```json
{
  "message": "Annulée"
}
```

#### Valider une réservation (admin)

```
PATCH /api/reservations/:id/validate
```

Authentification requise (admin)

Réponse (200 OK):
```json
{
  "message": "Réservation confirmée",
  "reservation": {
    "id": 2,
    "status": "confirmed"
  }
}
```

## Menu

### Endpoints du menu

#### Obtenir tous les éléments du menu

```
GET /api/menu
```

Aucune authentification requise

Réponse (200 OK):
```json
[
  {
    "id": 1,
    "name": "Steak au poivre",
    "description": "Steak avec sauce au poivre noir",
    "price": 22.5,
    "category": "plat"
  },
  {
    "id": 2,
    "name": "Tarte au citron",
    "description": "Dessert citronné avec meringue",
    "price": 8.5,
    "category": "dessert"
  }
]
```

## Disponibilité

Système de gestion des horaires d'ouverture et des créneaux disponibles.

### Endpoints de disponibilité

#### Vérifier les créneaux disponibles pour une date

```
GET /api/availability?date=2025-03-20
```

Aucune authentification requise

Réponse (200 OK):
```json
{
  "date": "2025-03-20",
  "is_closed": false,
  "available_slots": [
    {
      "time": "12:00:00",
      "duration": 90,
      "is_exceptional": false,
      "available": true
    },
    {
      "time": "19:30:00",
      "duration": 90,
      "is_exceptional": false,
      "available": false
    },
    {
      "time": "21:00:00",
      "duration": 90,
      "is_exceptional": false,
      "available": true
    }
  ]
}
```

#### Obtenir tous les créneaux standards (admin)

```
GET /api/availability/admin/opening-slots
```

Authentification requise (admin)

Réponse (200 OK):
```json
[
  {
    "id": 1,
    "day_of_week": 1,
    "time": "12:00:00",
    "duration": 90,
    "is_active": true
  },
  {
    "id": 2,
    "day_of_week": 1,
    "time": "19:30:00",
    "duration": 90,
    "is_active": true
  }
]
```

#### Créer ou mettre à jour un créneau standard (admin)

```
POST /api/availability/admin/opening-slots
```

Authentification requise (admin)

Corps de la requête:
```json
{
  "day_of_week": 2,
  "time": "12:00:00",
  "duration": 90,
  "is_active": true
}
```

Réponse (201 Created):
```json
{
  "message": "Créneau créé",
  "slot": {
    "id": 3,
    "day_of_week": 2,
    "time": "12:00:00",
    "duration": 90,
    "is_active": true
  }
}
```

#### Créer ou mettre à jour une date exceptionnelle (admin)

```
POST /api/availability/admin/exceptional-dates
```

Authentification requise (admin)

Corps de la requête pour fermeture exceptionnelle:
```json
{
  "date": "2025-04-01",
  "is_closed": true,
  "note": "Fermeture exceptionnelle pour jour férié"
}
```

Corps de la requête pour créneaux exceptionnels:
```json
{
  "date": "2025-04-15",
  "is_closed": false,
  "note": "Horaires spéciaux",
  "slots": [
    {
      "time": "11:30:00",
      "duration": 90
    },
    {
      "time": "19:00:00",
      "duration": 120
    }
  ]
}
```

Réponse (201 Created):
```json
{
  "message": "Date exceptionnelle créée",
  "exceptionalDate": {
    "id": 1,
    "date": "2025-04-15",
    "is_closed": false,
    "note": "Horaires spéciaux",
    "ExceptionalSlots": [
      {
        "id": 1,
        "exceptional_date_id": 1,
        "date": "2025-04-15",
        "time": "11:30:00",
        "duration": 90
      },
      {
        "id": 2,
        "exceptional_date_id": 1,
        "date": "2025-04-15",
        "time": "19:00:00",
        "duration": 120
      }
    ]
  }
}
```

## Modèles de données

### User

- `id`: INTEGER (PK)
- `email`: STRING (unique)
- `password_hash`: STRING
- `firstname`: STRING
- `lastname`: STRING
- `phone`: STRING
- `role`: STRING (défaut: "client")

### Table

- `id`: INTEGER (PK)
- `name`: STRING
- `seats`: INTEGER (2, 4, ou 6)
- `location`: STRING

### Reservation

- `id`: INTEGER (PK)
- `user_id`: INTEGER (FK)
- `number_of_people`: INTEGER
- `date`: DATEONLY
- `time`: TIME
- `note`: TEXT
- `status`: STRING (défaut: "pending")

### ReservationTable (Table de jointure)

- `ReservationId`: INTEGER (PK, FK)
- `TableId`: INTEGER (PK, FK)

### MenuItem

- `id`: INTEGER (PK)
- `name`: STRING
- `description`: TEXT
- `price`: FLOAT
- `category`: STRING

### OpeningSlot

- `id`: INTEGER (PK)
- `day_of_week`: INTEGER (0-6, 0=Dimanche)
- `time`: TIME
- `duration`: INTEGER (minutes)
- `is_active`: BOOLEAN

### ExceptionalDate

- `id`: INTEGER (PK)
- `date`: DATEONLY
- `is_closed`: BOOLEAN
- `note`: STRING

### ExceptionalSlot

- `id`: INTEGER (PK)
- `exceptional_date_id`: INTEGER (FK)
- `date`: DATEONLY
- `time`: TIME
- `duration`: INTEGER (minutes)
