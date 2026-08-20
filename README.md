# Arcade Nexus

ERP Gestion de Salle de Jeux (Gaming Lounge Management System)

Objectif

Créer un ERP moderne, professionnel et responsive pour gérer une salle de jeux vidéo et de loisirs.

Le système doit fonctionner avec un backend complet, une base de données sécurisée, une authentification par rôles, un tableau de bord interactif et des statistiques avancées.

L'application doit être prête pour une utilisation réelle.

Technologies

Frontend moderne (React + TypeScript)

Backend robuste (Node.js + NestJS ou Express)

PostgreSQL

Prisma ORM

Authentification JWT

Dashboard moderne

API REST

Responsive (ordinateur + tablette)

Architecture évolutive

Authentification

Administrateur

L'administrateur peut :

Créer des comptes employés

Supprimer des comptes

Modifier les comptes

Modifier les mots de passe

Attribuer les rôles

Voir toutes les statistiques

Ajouter ou supprimer des jeux

Ajouter ou supprimer des postes

Modifier les prix

Consulter les bénéfices

Gérer les dépenses

Exporter les rapports PDF et Excel

Sauvegarder les données

Employé

L'employé peut uniquement :

Démarrer une location

Arrêter une location

Encaisser un client

Ajouter des boissons

Voir les postes disponibles

Voir les réservations

L'employé NE PEUT PAS :

Créer un compte

Voir les bénéfices

Voir les dépenses

Modifier les prix

Voir les statistiques globales

Supprimer des données

Gestion des postes

L'administrateur peut créer un nombre illimité de postes.

Exemple :

PS5 1

PS5 2

PS5 3

PS4 1

PS4 2

Xbox Series X

Nintendo Switch

Baby-foot

Billard

Simulateur

VR

Chaque poste possède :

Nom

Catégorie

Tarif par heure

Tarif par partie (optionnel)

Etat :

Disponible

Occupé

Maintenance

Couleur personnalisée

Photo (optionnelle)

Deux modes de facturation

Mode Chronomètre

Exemple :

PS5 1

300 DA / heure

Lorsque l'employé clique sur "Démarrer", un chronomètre démarre.

Au clic sur "Arrêter", le système calcule automatiquement :

Durée

Montant

Historique

Exemple :

Début : 14:10

Fin : 15:40

Temps : 1h30

Prix : 450 DA

Mode Partie

Exemple :

Billard

150 DA la partie

Le client achète :

3 parties

Le système calcule :

3 × 150 = 450 DA

Autre exemple :

Baby-foot

100 DA

5 parties

Total :

500 DA

Vente de boissons

Créer un mini POS.

Exemple :

Coca

Eau

Jus

Chips

Chocolat

Red Bull

Chaque produit possède :

Nom

Prix

Stock

Image

Catégorie

Lors d'une location, l'employé peut ajouter des produits.

Exemple :

PS5

2 Coca

1 Chips

Total automatiquement calculé.

Gestion du stock

Le système diminue automatiquement le stock.

Alerte lorsque le stock devient faible.

Historique des entrées et sorties.

Réservations

Réserver un poste.

Nom du client

Téléphone

Date

Heure

Durée

Le poste devient réservé.

Dépenses

Créer un module complet.

Catégories :

Loyer

Electricité

Internet

Salaire

Maintenance

Achats boissons

Nettoyage

Impôts

Autres

Chaque dépense contient :

Date

Montant

Description

Catégorie

Pièce justificative (photo)

Calcul automatique des bénéfices

Calculer automatiquement :

Recettes jeux

Recettes boissons

=

Chiffre d'affaires

Dépenses

=

Bénéfice net

Exemple :

Jeux :

250 000 DA

Boissons :

50 000 DA

Total :

300 000 DA

Electricité :

20 000 DA

Loyer :

40 000 DA

Internet :

5 000 DA

Salaire :

80 000 DA

Bénéfice :

155 000 DA

Tableau de bord

Créer un dashboard professionnel.

Afficher :

Chiffre d'affaires du jour

Chiffre du mois

Bénéfice

Nombre de locations

Nombre de parties

Temps total joué

Produits vendus

Jeu le plus rentable

Poste le plus utilisé

Taux d'occupation

Top boissons

Nombre de clients

Graphiques interactifs.

Statistiques détaillées

Pouvoir analyser :

Par poste

Exemple :

PS5 1

Aujourd'hui :

2500 DA

Cette semaine :

13000 DA

Ce mois :

48000 DA

Temps joué :

12h30

Nombre de locations :

18

PS5 2

Aujourd'hui :

500 DA

Temps joué :

1h45

Nombre de locations :

2

Comparer automatiquement les postes.

Statistiques par catégorie

PS5

PS4

Billard

Baby-foot

Xbox

VR

Voir :

Le plus rentable

Le moins rentable

Le plus utilisé

Le moins utilisé

Statistiques par période

Aujourd'hui

Hier

7 jours

30 jours

Année

Personnalisé

Historique

Historique complet de toutes les opérations.

Location

Vente

Connexion

Suppression

Modification

Paiement

Filtrage par date.

Tickets

Après paiement, générer un ticket.

Nom du poste

Début

Fin

Durée

Prix

Boissons

Total

Employé

Date

Numéro de ticket

Impression.

Rapports

Exporter :

PDF

Excel

CSV

Rapport journalier

Hebdomadaire

Mensuel

Annuel

Notifications

Stock faible

Poste en maintenance

Réservation imminente

Sauvegarde réussie

Nouvelle mise à jour

Interface

Interface moderne inspirée de :

Stripe Dashboard

Notion

Linear

Vercel

Supabase

Mode clair/sombre.

Animations fluides.

Icônes modernes.

Cartes élégantes.

Graphiques professionnels.

Base de données

Créer toutes les tables nécessaires :

Users

Roles

Permissions

GameCategories

GameStations

Sessions

SessionDetails

Reservations

Products

ProductCategories

Sales

SaleItems

Expenses

ExpenseCategories

Suppliers

Inventory

Customers

Payments

Statistics

ActivityLogs

Settings

Relations optimisées avec Prisma.

Sécurité

JWT

Hash des mots de passe (bcrypt)

Permissions par rôle

Journal des actions (Audit Log)

Protection CSRF

Validation serveur

Gestion des erreurs

Sauvegardes automatiques

Fonctionnalités supplémentaires

Recherche instantanée

Filtres avancés

Pagination

Notifications en temps réel

Dashboard en temps réel (WebSocket)

Sauvegarde automatique

Impression des tickets

Export PDF/Excel

Configuration des tarifs par poste

Tarifs spéciaux (week-end, nuit, promotion)

Historique complet

Base de données optimisée

Code propre, modulaire et documenté

L'application doit être prête pour une utilisation en production, avec une architecture professionnelle, une interface moderne, des performances élevées et une excellente expérience utilisateur.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gamehubdz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b4898ce-8b72-4693-800b-75d37ad0493f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
