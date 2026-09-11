-- Greatlife — Migration 004 : Seed des données par défaut (menu + contenu)
-- ===================================================================
-- Amorce le menu et le contenu du site pour le mode Supabase.
-- Idempotent : supprime puis réinsère les items du menu.

DELETE FROM public.menu_items WHERE name IN ('Le Greatlife', 'Le Tropical', 'Le Volcan', 'Le Garden', 'Le Safari', 'Le Pure', 'Wrap Tropical', 'Wrap Garden', 'Wrap Safari', 'Salade Tropicale', 'Salade Fouta', 'Salade Poulet & Fruits', 'Frites de patate douce', 'Frites classiques', 'Frites de manioc épicées', 'Wedges de plantain', 'Mangue fraîche', 'Ananas-gingembre', 'Papaye-lait de coco', 'Banane-cacao', 'Corossol', 'Bissap-hibiscus', 'Greatlife Morning', 'Pancakes plantain', 'Bol d''avocat', 'Porridge de mil', 'Ananas rôti au miel', 'Mousse mangue-cardamome', 'Banane plantain caramélisée', 'Yaourt bio fruits tropicaux', 'Café de Guinée', 'Thé vert à la menthe', 'Tisane de kinkeliba', 'Tisane de baobab', 'Tisane gingembre-citron', 'Chocolat chaud cacao', 'Greatlife Kids', 'Burger Forêt de Fouta-Djallon');

INSERT INTO public.menu_items (cat, name, sig, price, description, vertus, badges, sort_order) VALUES
  ('Burgers', 'Le Greatlife', true, '48 000', 'Le burger qui réconcilie gourmandise et conscience : steak bio juteux, cheddar fondant, chutney mangue-ananas, et notre sauce signature.', 'Protéines (bœuf bio), calcium (cheddar), antioxydants et vitamine C (mangue, ananas).', '["omni","gluten","lactose"]'::jsonb, 0),
  ('Burgers', 'Le Tropical', false, '45 000', 'Poulet bio mariné, ananas grillé caramélisé et laitue croquante : une bouffée tropicale à chaque bouchée.', 'Protéines maigres (poulet), broméline de l''ananas qui aide la digestion, vitamine C, fibres.', '["omni","gluten"]'::jsonb, 1),
  ('Burgers', 'Le Volcan', false, '46 000', 'Pour les amateurs de sensations : steak bio, piment local et sauce piquante pour réveiller les papilles.', 'Protéines, capsaïcine du piment qui stimule le métabolisme, vitamines.', '["omni","gluten"]'::jsonb, 2),
  ('Burgers', 'Le Garden', false, '42 000', 'Galette de légumes et céréales, avocat crémeux et chutney de papaye : 100% végétal, 100% gourmand.', 'Fibres, acides gras essentiels (avocat), vitamines A & C (papaye), protéines végétales.', '["vege","gluten"]'::jsonb, 3),
  ('Burgers', 'Le Safari', false, '44 000', 'Poulet bio, beurre de cacahuète onctueux, mangue fraîche et coriandre : un voyage de saveurs inattendu.', 'Protéines, acides gras et protéines végétales (arachide), vitamine C (mangue), antioxydants.', '["omni","gluten","arachide"]'::jsonb, 4),
  ('Burgers', 'Le Pure', false, '40 000', 'Galette 100% végétale, tomate, oignon et sauce corossol : la pureté végétale, sans complexe.', 'Fibres, vitamine C (corossol), antioxydants ; le corossol est réputé pour ses vertus digestives.', '["vege","gluten"]'::jsonb, 5),
  ('Wraps', 'Wrap Tropical', false, '38 000', 'Poulet bio, mangue juteuse et laitue croquante enroulés dans une galette moelleuse.', 'Protéines maigres, vitamine C, fibres.', '["omni","gluten"]'::jsonb, 6),
  ('Wraps', 'Wrap Garden', false, '36 000', 'Galette végé, avocat, papaye et coriandre : frais, léger et nourrissant.', 'Acides gras sains, vitamines A & C, fibres.', '["vege","gluten"]'::jsonb, 7),
  ('Wraps', 'Wrap Safari', false, '37 000', 'Beurre de cacahuète, plantain et salade croquante : énergie durable et plaisir rond.', 'Protéines végétales, potassium (plantain), bonnes graisses.', '["omni","gluten","arachide"]'::jsonb, 8),
  ('Salades', 'Salade Tropicale', false, '35 000', 'Mangue, avocat, ananas et noix de cajou : la fraîcheur tropicale en grand format.', 'Antioxydants, acides gras, broméline (digestion), fibres.', '["vege","arachide"]'::jsonb, 9),
  ('Salades', 'Salade Fouta', false, '32 000', 'Laitue, tomate locale et oignon dans une vinaigrette de mangue : croquant et vivifiant.', 'Fibres, vitamine C, lycopène (tomate), hydratation.', '["vege"]'::jsonb, 10),
  ('Salades', 'Salade Poulet & Fruits', false, '40 000', 'Poulet bio, ananas, papaye et graines : sucré-salé équilibré.', 'Protéines, vitamines A & C, oméga (graines).', '["omni"]'::jsonb, 11),
  ('Frites & côtés', 'Frites de patate douce', true, '14 000', 'Dorées, croustillantes, naturellement sucrées : la signature Greatlife.', 'Bêta-carotène (vitamine A), fibres, potassium.', '[]'::jsonb, 12),
  ('Frites & côtés', 'Frites classiques', false, '12 000', 'L''indémodable, version bio.', 'Potassium, fibres (peau conservée).', '[]'::jsonb, 13),
  ('Frites & côtés', 'Frites de manioc épicées', false, '13 000', 'Croustillantes et relevées, l''âme ouest-africaine.', 'Glucides complexes (énergie), sans gluten, fibres.', '[]'::jsonb, 14),
  ('Frites & côtés', 'Wedges de plantain', false, '12 000', 'Moelleux dedans, grillés dehors : le plantain dans sa meilleure forme.', 'Potassium, vitamines A & C, fibres.', '[]'::jsonb, 15),
  ('Milkshakes & smoothies', 'Mangue fraîche', false, '20 000', 'Pur fruit, pur plaisir : la mangue dans sa splendeur.', 'Vitamine C, bêta-carotène, antioxydants.', '["vege"]'::jsonb, 16),
  ('Milkshakes & smoothies', 'Ananas-gingembre', false, '20 000', 'La fraîcheur acidulée de l''ananas piquée du gingembre tonifiant.', 'Broméline (digestion), anti-inflammatoire (gingembre), vitamine C.', '["vege"]'::jsonb, 17),
  ('Milkshakes & smoothies', 'Papaye-lait de coco', false, '22 000', 'Velouté tropical, doux et crémeux.', 'Papaïne (digestion), acides gras sains, vitamine A.', '["vege"]'::jsonb, 18),
  ('Milkshakes & smoothies', 'Banane-cacao', false, '18 000', 'Douceur gourmande au cœur cacao riche.', 'Potassium, magnésium, antioxydants (cacao).', '["vege"]'::jsonb, 19),
  ('Milkshakes & smoothies', 'Corossol', false, '24 000', 'Exotique et légèrement acidulé, le corossol vitaminé.', 'Vitamine C, fibres ; réputé antioxydant et digestif.', '["vege"]'::jsonb, 20),
  ('Milkshakes & smoothies', 'Bissap-hibiscus', false, '16 000', 'Rouge vif, désaltérant : l''infusion nationale glacée.', 'Antioxydants, hypotenseur naturel, vitamine C.', '["vege"]'::jsonb, 21),
  ('Petit-déjeuner', 'Greatlife Morning', false, '25 000', 'Pain brioché bio, beurre de cacahuète et smoothie : le réveil qui donne des ailes.', 'Protéines, bonnes graisses, énergie longue.', '["vege","gluten","arachide"]'::jsonb, 22),
  ('Petit-déjeuner', 'Pancakes plantain', false, '23 000', 'Pancakes moelleux à la banane plantain, nappés de miel local.', 'Potassium, glucides lents, antioxydants (miel).', '["vege","gluten"]'::jsonb, 23),
  ('Petit-déjeuner', 'Bol d''avocat', false, '27 000', 'Avocat crémeux, œufs et pain au sésame : le réconfort matinal.', 'Acides gras sains, protéines, fibres.', '["omni","gluten"]'::jsonb, 24),
  ('Petit-déjeuner', 'Porridge de mil', false, '20 000', 'Mil, fruits tropicaux et miel : chaleur et énergie longue durée.', 'Protéines végétales, magnésium, fibres.', '["vege"]'::jsonb, 25),
  ('Desserts', 'Ananas rôti au miel', false, '15 000', 'Caramélisé, fruité, délicieusement simple.', 'Broméline, vitamine C, antioxydants (miel).', '["vege"]'::jsonb, 26),
  ('Desserts', 'Mousse mangue-cardamome', false, '17 000', 'Aérienne, parfumée, sans culpabilité.', 'Vitamine C, fibres, digestion (cardamome).', '["vege"]'::jsonb, 27),
  ('Desserts', 'Banane plantain caramélisée', false, '14 000', 'Tendre et dorée, la gourmandise naturelle.', 'Potassium, fibres, énergie.', '["vege"]'::jsonb, 28),
  ('Desserts', 'Yaourt bio fruits tropicaux', false, '15 000', 'Onctueux et vivant, probiotiques inclus.', 'Probiotiques (flore intestinale), calcium, vitamines.', '["vege","lactose"]'::jsonb, 29),
  ('Boissons chaudes', 'Café de Guinée', false, '12 000', 'Arômes de la région Forestière, torréfaction maison.', 'Antioxydants, stimulation (caféine).', '["vege"]'::jsonb, 30),
  ('Boissons chaudes', 'Thé vert à la menthe', false, '10 000', 'Fraîchement infusé, le rituel réconfortant.', 'Antioxydants (catéchines), digestion.', '["vege"]'::jsonb, 31),
  ('Boissons chaudes', 'Tisane de kinkeliba', false, '11 000', 'Plante guinéenne traditionnelle, alliée de la digestion.', 'Digestive, tonique, réputée dépurative.', '["vege"]'::jsonb, 32),
  ('Boissons chaudes', 'Tisane de baobab', false, '12 000', 'Fruit du baobab, riche et acidulé.', 'Vitamine C, fibres, fer.', '["vege"]'::jsonb, 33),
  ('Boissons chaudes', 'Tisane gingembre-citron', false, '11 000', 'Le grand réconfort tonique, maison.', 'Anti-inflammatoire, immunité (vitamine C), digestion.', '["vege"]'::jsonb, 34),
  ('Boissons chaudes', 'Chocolat chaud cacao', false, '16 000', 'Cacao local bio, velours en tasse.', 'Antioxydants, magnésium, réconfort.', '["vege","lactose"]'::jsonb, 35),
  ('Menu enfant', 'Greatlife Kids', false, '28 000', 'Mini-burger ou galette, frites, smoothie et dessert : le menu complet qui fait grandir.', 'Protéines, calcium, vitamines, énergie équilibrée.', '["omni","gluten","lactose"]'::jsonb, 36),
  ('Suggestions', 'Burger Forêt de Fouta-Djallon', false, '52 000', 'Édition saisonnière à partir des arrivages locaux du moment. Renforce le circuit-court.', 'Dépend des arrivages — fraîcheur et saisonnalité garanties.', '["omni","gluten"]'::jsonb, 37);

-- Contenu du site (clé unique site_config)
INSERT INTO public.site_content (key, value, updated_at)
VALUES (
  'site_config',
  '{"slogan":"Manger vite. Manger bio. Manger gourmand.","heroTitle":"Le fast-food sans culpabilité.","heroSub":"Produits bio, emballages écologiques, cuisson saine et saveurs tropicales — Greatlife prouve que le bien manger n''est pas un luxe.","storyTitle":"Notre histoire","story":"Greatlife est né d''une frustration simple : aimer le fast-food, mais refuser de le payer avec sa santé. Ayant grandi avec la street-food africaine, j''ai vu qu''on pouvait allier vitesse, goût intense et produits sains. J''ai voulu prouver que le bio n''est pas un luxe — c''est juste une question d''honnêteté.","emailContact":"contact@greatlife.gn","emailReservation":"resa@greatlife.gn","autoReply":"Bonjour {nom}, merci pour votre message à Greatlife ! Nous revenons vers vous sous 24h. — L''équipe Greatlife"}'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
