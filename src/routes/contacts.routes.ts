/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/auth.middleware';
import {
  searchUserByPhone,
  addContact,
  getContacts,
  removeContact,
  blockContact,
  startPrivateChat
} from '../controllers/contacts.controller';

const router = Router();

// Rechercher un utilisateur par numéro de téléphone
router.post('/search', protect, [
  body('phone').isString().notEmpty().withMessage('Numero de telephone requis')
], searchUserByPhone);

// Lister mes contacts
router.get('/', protect, getContacts);

// Ajouter un contact
router.post('/add', protect, [
  body('contactUserId').isUUID().withMessage('ID contact invalide')
], addContact);

// Supprimer un contact
router.delete('/:contactUserId', protect, [
  param('contactUserId').isUUID()
], removeContact);

// Bloquer un contact
router.post('/block/:contactUserId', protect, [
  param('contactUserId').isUUID()
], blockContact);

// Démarrer une conversation privée
router.post('/start-private-chat', protect, [
  body('contactUserId').isUUID().withMessage('ID contact invalide')
], startPrivateChat);

export default router;
