/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright (c) 2025 Rollin Loic Tianga. Tous droits reserves.
 */
import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';

// POST /api/contacts/search
// Recherche un utilisateur par numéro de téléphone complet
export const searchUserByPhone = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { phone } = req.body;

  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!phone) return res.status(400).json({ success: false, error: 'Numero de telephone requis' });

  try {
    const normalizedPhone = phone.trim().replace(/\s/g, '');

    const { data: user, error } = await supabase
      .from('users')
      .select('id, pseudo, avatar_url, community, nationality_name, country_name, is_verified')
      .eq('phone_number', normalizedPhone)
      .neq('id', currentUserId) // Exclure soi-même
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'Aucun utilisateur BelAfrica trouve avec ce numero.',
        notOnApp: true
      });
    }

    // Vérifier si déjà en contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, status')
      .eq('user_id', currentUserId)
      .eq('contact_user_id', user.id)
      .single();

    res.status(200).json({
      success: true,
      user: {
        ...user,
        isAlreadyContact: !!existingContact && existingContact.status === 'active',
        isBlocked: existingContact?.status === 'blocked'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// POST /api/contacts/search-pseudo
// Rechercher un membre par pseudo dans la même communauté
export const searchUserByPseudo = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const currentUserCommunity = req.user?.community;
  const { pseudo } = req.body;

  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!pseudo || pseudo.length < 2) return res.status(400).json({ success: false, error: 'Pseudo trop court' });

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, pseudo, avatar_url, community, nationality_name, country_name, is_verified')
      .ilike('pseudo', `%${pseudo}%`)         // recherche insensible à la casse
      .eq('community', currentUserCommunity)   // uniquement même communauté
      .neq('id', currentUserId)               // exclure soi-même
      .eq('is_verified', true)
      .limit(20);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    // Enrichir avec le statut de contact
    const enriched = await Promise.all(users.map(async (user: any) => {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, status')
        .eq('user_id', currentUserId)
        .eq('contact_user_id', user.id)
        .single();

      return {
        ...user,
        isAlreadyContact: !!existingContact && existingContact.status === 'active',
        isBlocked: existingContact?.status === 'blocked'
      };
    }));

    res.status(200).json({ success: true, users: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// POST /api/contacts/add
// Ajouter un contact
export const addContact = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { contactUserId } = req.body;

  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!contactUserId) return res.status(400).json({ success: false, error: 'contactUserId requis' });
  if (contactUserId === currentUserId) return res.status(400).json({ success: false, error: 'Vous ne pouvez pas vous ajouter vous-meme' });

  try {
    // Vérifier que l'utilisateur existe
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, pseudo')
      .eq('id', contactUserId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    // Upsert contact (ajoute ou reactive si bloqué)
    const { error } = await supabase
      .from('contacts')
      .upsert({ user_id: currentUserId, contact_user_id: contactUserId, status: 'active' },
        { onConflict: 'user_id,contact_user_id' });

    if (error) throw error;

    res.status(201).json({ success: true, message: `${targetUser.pseudo} ajoute a vos contacts` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/contacts
// Lister tous les contacts
export const getContacts = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        id,
        status,
        created_at,
        contact_user_id,
        contact_user:users!contacts_contact_user_id_fkey(
          id, pseudo, avatar_url, community, nationality_name, is_verified
        )
      `)
      .eq('user_id', currentUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Pour chaque contact, chercher la conversation privée existante
    const enriched = await Promise.all((contacts || []).map(async (c: any) => {
      const contact = c.contact_user;

      // Chercher conversation privée existante entre les deux utilisateurs
      const privateConversationId = await getPrivateConversationId(currentUserId, c.contact_user_id);

      return {
        id: c.id,
        userId: c.contact_user_id,
        pseudo: contact?.pseudo || 'Inconnu',
        avatar: contact?.avatar_url,
        community: contact?.community,
        nationalityName: contact?.nationality_name,
        isVerified: contact?.is_verified,
        privateConversationId,
        addedAt: c.created_at
      };
    }));

    res.status(200).json({ success: true, contacts: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/contacts/:contactUserId
export const removeContact = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { contactUserId } = req.params;
  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', currentUserId)
      .eq('contact_user_id', contactUserId);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Contact supprime' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/contacts/block/:contactUserId
export const blockContact = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { contactUserId } = req.params;
  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });

  try {
    const { error } = await supabase
      .from('contacts')
      .upsert({ user_id: currentUserId, contact_user_id: contactUserId, status: 'blocked' },
        { onConflict: 'user_id,contact_user_id' });

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Contact bloque' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/contacts/start-private-chat
// Créer ou récupérer une conversation privée avec un contact
export const startPrivateChat = async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { contactUserId } = req.body;

  if (!currentUserId) return res.status(401).json({ success: false, error: 'Non autorise' });
  if (!contactUserId) return res.status(400).json({ success: false, error: 'contactUserId requis' });

  try {
    // Vérifier que c'est bien un contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('contact_user_id', contactUserId)
      .eq('status', 'active')
      .single();

    if (!contact) {
      return res.status(403).json({
        success: false,
        error: 'Vous ne pouvez discuter qu\'avec vos contacts BelAfrica.'
      });
    }

    // Vérifier si conversation privée existe déjà
    const existingConvId = await getPrivateConversationId(currentUserId, contactUserId);

    if (existingConvId) {
      return res.status(200).json({ success: true, conversationId: existingConvId, isNew: false });
    }

    // Créer la conversation privée
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'private', created_by: currentUserId })
      .select('id')
      .single();

    if (convError || !newConv) throw convError || new Error('Echec creation conversation');

    // Ajouter les deux participants
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: currentUserId },
        { conversation_id: newConv.id, user_id: contactUserId }
      ]);

    if (partError) throw partError;

    res.status(201).json({ success: true, conversationId: newConv.id, isNew: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper: trouver l'ID d'une conversation privée entre deux utilisateurs
async function getPrivateConversationId(userId1: string, userId2: string): Promise<string | null> {
  try {
    const { data: convs1 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId1);

    const { data: convs2 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2);

    if (!convs1 || !convs2) return null;

    const ids1 = new Set(convs1.map((c: any) => c.conversation_id));
    const commonIds = convs2
      .filter((c: any) => ids1.has(c.conversation_id))
      .map((c: any) => c.conversation_id);

    if (commonIds.length === 0) return null;

    // Vérifier que c'est bien une conversation privée
    const { data: privateConv } = await supabase
      .from('conversations')
      .select('id')
      .in('id', commonIds)
      .eq('type', 'private')
      .single();

    return privateConv?.id || null;
  } catch {
    return null;
  }
}
