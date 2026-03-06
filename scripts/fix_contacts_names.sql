-- =============================================================
-- Скрипт нормализации имён контактов
-- 1. Удаление никнеймов
-- 2. Объединение дубликатов
-- 3. Перевод латиницы на русский
-- 4. Приведение формата ФИО → Имя Отчество Фамилия
-- =============================================================

BEGIN;

-- =============================================================
-- 1. УДАЛЕНИЕ НИКНЕЙМОВ
-- =============================================================
DELETE FROM contacts WHERE id = 'edc93e86-ecf5-4a15-a8fe-f1a213c0d950'; -- Candy88Oksik
DELETE FROM contacts WHERE id = 'a4c669b4-7566-42c8-a70c-9536338cf02a'; -- Persik02@
DELETE FROM contacts WHERE id = 'dccc8208-f8a5-4d94-80a5-ab004f66b51f'; -- D VOZLUBLENNY
DELETE FROM contacts WHERE id = 'd35482c7-b2e8-4315-8d90-3a21e7353692'; -- Коммерческое предложение

-- =============================================================
-- 2. ОБЪЕДИНЕНИЕ ДУБЛИКАТОВ
-- =============================================================

-- Gadiatti Tina (87f6276e) + Гадиати Тина Георгиевна (26dd3eb0)
-- Оставляем русский контакт (26dd3eb0), переименовываем в "Тина Георгиевна Гадиати"
-- Удаляем латинский (87f6276e)
DELETE FROM contacts WHERE id = '87f6276e-2239-460d-8359-c547c6a1cac3'; -- Gadiatti Tina (дубликат)
UPDATE contacts SET full_name = 'Тина Георгиевна Гадиати' WHERE id = '26dd3eb0-25bb-4d50-84c4-591ead626702';

-- Арабачян Mariam (21138b51) + Арабачян Мариам (6200db96)
-- Оставляем один (6200db96), переименовываем в "Мариам Арабачян"
-- Удаляем латинский (21138b51)
DELETE FROM contacts WHERE id = '21138b51-2589-4f82-bdc3-6f3d3d438db4'; -- Арабачян Mariam (дубликат)
UPDATE contacts SET full_name = 'Мариам Арабачян' WHERE id = '6200db96-24a9-4354-ab81-13a15fd15efa';

-- Давид Галдава (cc58b8ec) + Галдава Давид Энрикоевич (cdc2b1d5)
-- Оставляем один (cdc2b1d5), переименовываем в "Давид Энрикоевич Галдава"
-- Удаляем дубликат (cc58b8ec)
DELETE FROM contacts WHERE id = 'cc58b8ec-1a2f-435a-a160-534dac35ff2b'; -- Давид Галдава (дубликат)
UPDATE contacts SET full_name = 'Давид Энрикоевич Галдава' WHERE id = 'cdc2b1d5-0c42-40c9-8b3b-24fda4b1d2aa';

-- =============================================================
-- 3. АНОМАЛИИ — ДУБЛИРУЮЩИЕСЯ ИМЕНА
-- =============================================================

-- "Анатолий Васильевич Леванов Анатолий Васильевич Леванов Анатолий Васильевич Леванов"
UPDATE contacts SET full_name = 'Анатолий Васильевич Леванов'
  WHERE id = '3617a499-81a7-41ef-aa01-dddf27358969';

-- "Дана Башибаева Дана Башибаева Саметовна" → "Дана Саметовна Башибаева"
UPDATE contacts SET full_name = 'Дана Саметовна Башибаева'
  WHERE id = '4f998d74-2a60-49d9-b6a8-2fd977756116';

-- "Юлия Юрьевна Николаенко Юлия Юрьевна Николаенко Юлия Юрьевна Николаенко" → "Юлия Юрьевна Николаенко"
UPDATE contacts SET full_name = 'Юлия Юрьевна Николаенко'
  WHERE id = '1ceb5eea-a41f-4e06-b017-9da25cba0998';

-- =============================================================
-- 4. ПЕРЕВОД ЛАТИНИЦЫ НА РУССКИЙ
-- =============================================================
UPDATE contacts SET full_name = 'Аида'              WHERE id = 'dc6ec315-29c6-43ab-9a3b-17bbd3d65203'; -- Aida
UPDATE contacts SET full_name = 'Айгуль Даулбаева'  WHERE id = 'cbca55ee-4328-438c-b481-fb30564f6720'; -- Aigul Daulbaeva
UPDATE contacts SET full_name = 'Александр'         WHERE id = '4cebd4aa-af72-4413-b7cb-c9db2e355285'; -- Aleks
UPDATE contacts SET full_name = 'Анель'             WHERE id = '159849fa-c3bc-4a37-9300-93857d5029a4'; -- Anel
UPDATE contacts SET full_name = 'Артём'             WHERE id = '5bdc6ff3-01db-437b-9967-4a4fbe3d0e5a'; -- Artem
UPDATE contacts SET full_name = 'Асиф'              WHERE id = 'f504c188-78ee-4c40-84f2-2d100ad621b1'; -- Asif
UPDATE contacts SET full_name = 'Динара'            WHERE id = '215f7e23-3f55-443d-bbdc-9e108c944176'; -- Dinara
UPDATE contacts SET full_name = 'Фёдор'             WHERE id = '3f947687-c712-4913-a2f2-ef224fcfb11a'; -- Fedor
UPDATE contacts SET full_name = 'Гульмира'          WHERE id = '0836eaba-20e7-47a7-9b76-876063498ce4'; -- GULMIRA
UPDATE contacts SET full_name = 'Гульжан Мирманова' WHERE id = 'a0779850-41b9-4aa5-9611-3397d8ebc479'; -- GULZHAN MIRMANOVA
UPDATE contacts SET full_name = 'Ирина Нескоромных' WHERE id = 'e5f8dd6a-9c5f-46aa-8059-225c657fcae1'; -- Irina Neskoromnykh
UPDATE contacts SET full_name = 'Юлия Тырлова'      WHERE id = '586069bc-83ee-47fa-8528-0082fa609b42'; -- Julia Tyrlova
UPDATE contacts SET full_name = 'Майя'              WHERE id = '265d3f76-f71d-4a46-a494-e7cc6bc52deb'; -- Maia
UPDATE contacts SET full_name = 'Маргарита'         WHERE id = '4c4bbbfe-c4ca-4ef0-9a4e-11b2818640e7'; -- Margarita
UPDATE contacts SET full_name = 'Натали'            WHERE id = 'f49a86b5-e885-424b-969e-ec31e86b824b'; -- Natali
UPDATE contacts SET full_name = 'Наталия Огай'      WHERE id = 'fd455b3a-d57b-40e7-8f5d-317a6138ec1f'; -- Nataliya Ogay
UPDATE contacts SET full_name = 'Олеся'             WHERE id = 'f882e508-8ce0-49ea-b305-120c4c084c5d'; -- Olesya
UPDATE contacts SET full_name = 'Ольга'             WHERE id = '898a6553-ae15-4c6b-9be2-02103581bcd1'; -- Olga
UPDATE contacts SET full_name = 'Тельман'           WHERE id = '783d95dd-93ad-4686-a6cc-e7327e5bd05e'; -- Telman
UPDATE contacts SET full_name = 'Турабек'           WHERE id = 'c7aaf55b-dc4d-4e15-b238-47f186e7576b'; -- Turabek
UPDATE contacts SET full_name = 'Виктория'          WHERE id = '0e1450c6-2b0a-467a-8346-ab6cfbb0d234'; -- Victoria
UPDATE contacts SET full_name = 'Владимир Широкоряденко' WHERE id = 'b3cb39af-58d6-47c8-a0d4-7d9c0bbf19a9'; -- Vladimir Shirokoryadenko

-- =============================================================
-- 5. НОРМАЛИЗАЦИЯ РЕГИСТРА (все строчные → Title Case)
-- =============================================================
UPDATE contacts SET full_name = 'Галина'            WHERE id = '0af0590f-9c2f-47b9-92b5-e8803c3aba38'; -- галина
UPDATE contacts SET full_name = 'Екатерина'         WHERE id = '37de3d16-be74-47b6-8dae-86c32772a685'; -- екатерина
UPDATE contacts SET full_name = 'Иван'              WHERE id = '353f6431-c660-4c65-8718-39c38d30a08e'; -- иван
UPDATE contacts SET full_name = 'Ксения Алексеевна Казбекова' WHERE id = '20e5ce49-f76f-4d2c-b26b-fe2ced128881'; -- казбекова ксения алексеевна
UPDATE contacts SET full_name = 'Татьяна Ловягина'  WHERE id = '4014cb8f-b446-422f-8bf6-8442202a2981'; -- ловягина татьяна
UPDATE contacts SET full_name = 'Ольга Марьева'     WHERE id = '1b6c5a81-1220-4127-a5f2-eaadc2366410'; -- марьева ольга
UPDATE contacts SET full_name = 'Ника'              WHERE id = '9625b251-27b8-4eab-830d-bf88ca896af9'; -- ника
UPDATE contacts SET full_name = 'Виктория Правилова' WHERE id = '7e9e2736-f9d9-48d8-8302-fa6cf862c35a'; -- правилова виктория
UPDATE contacts SET full_name = 'Светлана'          WHERE id = '1f21d847-8e18-45f5-bff0-43f028911269'; -- светлана
UPDATE contacts SET full_name = 'Светлана Жестовская' WHERE id = 'b0692b71-4ba4-4753-861b-599282a1248b'; -- светлана жестовская
UPDATE contacts SET full_name = 'Сева Мусаева'      WHERE id = '1f640871-b22c-4bed-9ab6-47411a7dcd1d'; -- сева мусаева
UPDATE contacts SET full_name = 'Эдуард'            WHERE id = '02b9fc9c-dc37-4816-b27f-40e735531e0b'; -- эдуард
UPDATE contacts SET full_name = 'Виктория'          WHERE id = 'fc03cd9e-5e8a-4ebc-8aba-06e7a8383d2c'; -- ВИКТОРИЯ
UPDATE contacts SET full_name = 'Гульмира Ханатовна Бегалиева' WHERE id = '6225e6c9-b86f-473d-819d-a14c013dcc1f'; -- уже ФИО, но обновим в блоке 6
UPDATE contacts SET full_name = 'Евгения Георгиевна' WHERE id = '884aa0e5-cbcc-4a38-a276-8e5293a542d1'; -- ЕВГЕНИЯ ГЕОГРИЕВНА (исправляю опечатку ГЕОГРИЕВНА→ГЕОРГИЕВНА, убираю CAPS)

-- =============================================================
-- 6. ПРИВЕДЕНИЕ ФОРМАТА: Фамилия Имя [Отчество] → Имя [Отчество] Фамилия
-- =============================================================

UPDATE contacts SET full_name = 'Лаура Ербулатовна Абдрахманова'       WHERE id = '51e788b9-077b-47f0-9f55-417a58e83d5b';
UPDATE contacts SET full_name = 'Мухаммад Мухаммадович Абдуллаев'       WHERE id = '4af88278-7512-4dd7-a02f-d167208fd945';
UPDATE contacts SET full_name = 'Наира Джамалдиновна Абуева'            WHERE id = '4810a501-2021-463c-bf5c-f45f04115334';
UPDATE contacts SET full_name = 'Евгения Борисовна Авдеева'             WHERE id = '810fff60-d207-41fd-b1c0-c8deed6fb5f2';
UPDATE contacts SET full_name = 'Александр Аланович Адырхаев'           WHERE id = '58788768-31d7-45db-b87c-c2dd18cf8a79';
UPDATE contacts SET full_name = 'Гаджимурад Нурутдинович Айдамиров'     WHERE id = 'dc3949ee-b9a4-4ed4-9f94-762372ad31f3';
UPDATE contacts SET full_name = 'Айгуль Абдужалильевна Касямжанова'     WHERE id = '3c9b342a-c695-4e29-899e-2eca77b00626';
UPDATE contacts SET full_name = 'София Вахтанговна Алидвизе'            WHERE id = '32332521-7a0c-4896-abac-99b3d0220d1d';
UPDATE contacts SET full_name = 'Алмагуль Алимгереева'                  WHERE id = '0788a575-34f9-4f21-97e2-09307bcdd41f'; -- Алимгереева Алмагуль
UPDATE contacts SET full_name = 'Вера Аполлонова'                       WHERE id = 'e05e8a79-b818-497e-b0cc-0d2482dd6f5f';
UPDATE contacts SET full_name = 'Зурида Руслановна Бабенко'             WHERE id = '51e1fe91-6e4f-465a-8d3c-c41e6066fd4e';
UPDATE contacts SET full_name = 'Мария Евгеньевна Бабкина'              WHERE id = 'b1ea7023-71ed-47e3-ba38-28c6765220b1';
UPDATE contacts SET full_name = 'Татьяна Байбакова'                     WHERE id = '5b908ed8-0630-4486-96a6-0248b3837fbf';
UPDATE contacts SET full_name = 'Татьяна Игоревна Байбакова'            WHERE id = '70295328-bc17-4257-b560-0b33aa20e319';
UPDATE contacts SET full_name = 'Виктория Баландина'                    WHERE id = '1bf7f33d-f747-44c2-9480-041a3a7f3abd';
UPDATE contacts SET full_name = 'Гульмира Ханатовна Бегалиева'          WHERE id = '6225e6c9-b86f-473d-819d-a14c013dcc1f';
UPDATE contacts SET full_name = 'Анна Беляева'                          WHERE id = 'd0b6e3a0-42eb-4b9e-9d3d-eba0e2efca72'; -- Беляев Анна (ошибка рода)
UPDATE contacts SET full_name = 'Галина Богданова'                      WHERE id = 'a6577728-135e-4d33-837a-c8846e535c5b';
UPDATE contacts SET full_name = 'Александр Богуш'                       WHERE id = 'a15e3230-dd56-4d69-8206-08bde95df42d';
UPDATE contacts SET full_name = 'Юлия Бондарь'                         WHERE id = 'ac8943af-f89a-467f-bbc8-12d78eb87d31';
UPDATE contacts SET full_name = 'Татьяна Брежнева'                      WHERE id = 'd8429fcc-a3be-408e-8792-3af157f6b700';
UPDATE contacts SET full_name = 'Сергей Александрович Брылевский'       WHERE id = '62d64983-500d-4347-b5a6-8c7562801e1b';
UPDATE contacts SET full_name = 'Екатерина Булгакова'                   WHERE id = '47ef6890-a244-4ec3-8337-5c0118cc3849';
UPDATE contacts SET full_name = 'Екатерина Игоревна Бурматова'          WHERE id = 'fd1fbdde-c4da-4a6f-b115-80021684884f';
UPDATE contacts SET full_name = 'Сергей Быстров'                        WHERE id = 'ea788c30-1486-4bed-a908-a250d9749b12';
UPDATE contacts SET full_name = 'Инна Игоревна Важенина'                WHERE id = 'beb35349-0b73-4526-b50d-08cd6861f3f6';
UPDATE contacts SET full_name = 'Фёдор Валерьевич Вершинин'             WHERE id = 'b184dd59-1c42-498b-a9f2-75cd2ead03c0';
UPDATE contacts SET full_name = 'Татьяна Дмитриевна Веселова'           WHERE id = 'acbc10bf-375a-4ef0-8638-2c137697cf17';
UPDATE contacts SET full_name = 'Алексей Юрьевич Воронцов'              WHERE id = '9d748db9-03fc-4095-81a0-3c8b2636b223';
UPDATE contacts SET full_name = 'Татьяна Юрьевна Вощанкина'             WHERE id = '25f3813f-8d57-4ca2-a611-e333de1dd5af';
UPDATE contacts SET full_name = 'Анна Константиновна Вышакова'          WHERE id = '9d0a6d4c-e73c-4090-a2f2-2d99db18305c';
UPDATE contacts SET full_name = 'Нана Нугзаровна Гамгия'                WHERE id = '68ad44c7-a253-4903-9db4-3ac95311265f';
UPDATE contacts SET full_name = 'Валерия Геращенкова'                   WHERE id = '4099215f-79b8-440e-bc05-7b8a57bd0243';
UPDATE contacts SET full_name = 'Ярослав Геращенко'                     WHERE id = '90a918e6-17ee-409f-bb0e-102635cd6cc8';
UPDATE contacts SET full_name = 'Лилия Гербекова'                       WHERE id = '694f10ca-f40e-41a1-b5be-d84bef287c7a';
UPDATE contacts SET full_name = 'Елена Гнатовская'                      WHERE id = '383afc8f-fd48-4715-afea-c65e8761b41f';
UPDATE contacts SET full_name = 'Бахар Годжалар'                        WHERE id = 'b338628d-2b5c-4d3f-8481-7b66069a7dda';
UPDATE contacts SET full_name = 'Сергей Васильевич Голяков'             WHERE id = '2d8f2375-4bb0-4b00-ba6a-15e7dcc26ff3';
UPDATE contacts SET full_name = 'Мария Игоревна Горбунова'              WHERE id = 'c8b3969e-6536-4bec-94b4-be1a43f449c5';
UPDATE contacts SET full_name = 'Евгений Викторович Гордеев'            WHERE id = '3a8b0348-db63-44ab-a34f-951a1f42a07b';
UPDATE contacts SET full_name = 'Екатерина Горовая'                     WHERE id = '33fea921-91dd-411d-bffe-cadad75bddde';
UPDATE contacts SET full_name = 'Дмитрий Гришин'                        WHERE id = 'a84ed695-5d50-4551-9e8a-8c1bb96864ca';
UPDATE contacts SET full_name = 'Ирина Ивановна Грищенко'               WHERE id = '13a75f2f-3b98-4a72-8107-274fc590e552';
UPDATE contacts SET full_name = 'Наталья Гулина'                        WHERE id = '18575992-4b50-4a2b-ac32-d9247e59dcaf';
UPDATE contacts SET full_name = 'Марианна Гусева'                       WHERE id = '38b25ac4-c9a9-43f3-8fad-7e6a8ec833f9';
UPDATE contacts SET full_name = 'Улькер Гусейнова'                      WHERE id = 'ec09978d-4094-4b5d-a0ba-f697a5e83be8';
UPDATE contacts SET full_name = 'Анна Дацюк'                            WHERE id = 'b86f7b36-2f96-413c-81e0-004515659410';
UPDATE contacts SET full_name = 'Асват Демирбекова'                     WHERE id = '57785fa1-7f90-4319-b6ed-6131332319a4';
UPDATE contacts SET full_name = 'Аниса Аминовна Домбаева'               WHERE id = '7c99e281-9f41-44ed-b466-6c5ff636492f';
UPDATE contacts SET full_name = 'Дарья Алексеевна Донская'              WHERE id = '638dbd69-1982-40eb-94c6-e94526281c46';
UPDATE contacts SET full_name = 'Чолпон Сейитовна Доолоталиева'         WHERE id = 'a110c0b5-9d7d-4678-8c16-44b77179e0f6';
UPDATE contacts SET full_name = 'Елена Евдокимова'                      WHERE id = 'f9b07eb9-e1d7-4de0-8bf4-4b9c2f464fc9';
UPDATE contacts SET full_name = 'Ксения Александровна Елисеева'         WHERE id = 'dd1cc715-3d35-40f9-a388-e53a385b4e04';
UPDATE contacts SET full_name = 'Алина Алексеевна Емашева'              WHERE id = '26b049fa-f198-4dbd-a84c-1bdbacbe2d8b';
UPDATE contacts SET full_name = 'Ольга Олеговна Емельянова'             WHERE id = 'deeff501-318f-4b17-b29d-1993b9562b3e'; -- Емельянва→Емельянова (опечатка)
UPDATE contacts SET full_name = 'Нина Жаворонкова'                      WHERE id = '1b3267f8-1739-4764-913b-f348980cfdd9';
UPDATE contacts SET full_name = 'Ербол Исмаилович Жаппаров'             WHERE id = '492b3e91-56eb-49dc-a013-9ad06666d7c1';
UPDATE contacts SET full_name = 'Дарья Андреевна Жданова'               WHERE id = '84e2dd16-5fb1-49c0-93d3-fb4e5dc3a70d';
UPDATE contacts SET full_name = 'Олеся Журавлева'                       WHERE id = '6e57328f-f458-4d1c-ba48-8c9a67c6d754';
UPDATE contacts SET full_name = 'Валерий Николаевич Журавлев'           WHERE id = 'db8af534-63cf-447e-9459-6b1c7839960d';
UPDATE contacts SET full_name = 'Татьяна Валентиновна Загайнова'        WHERE id = '5f5f7499-773a-4219-a4fd-d81d6371681d';
UPDATE contacts SET full_name = 'Светлана Михайловна Занина'            WHERE id = '24a9f64a-fbba-4b75-91e1-ab7323bb5910';
UPDATE contacts SET full_name = 'Владислав Геннадьевич Звягин'          WHERE id = '30895936-4b9e-40aa-aac6-2e2255759a0b';
UPDATE contacts SET full_name = 'Марина Юрьевна Зинченко'               WHERE id = 'd940a126-e453-451d-ad43-0cfe6f2b29ee';
UPDATE contacts SET full_name = 'Ирина Вячеславовна Зуева'              WHERE id = '2e5439b7-865f-47c9-8f2a-c5924fc53004';
UPDATE contacts SET full_name = 'Лариса Илюхина'                        WHERE id = '7e67f0c4-82a6-4216-9359-8b4d4d035dd7';
UPDATE contacts SET full_name = 'Анастасия Руслановна Иноземцева'       WHERE id = '630b4786-45c3-4df6-b40d-6d15be67e89b';
UPDATE contacts SET full_name = 'Зарина Габитжановна Ислямова'          WHERE id = 'c213a8dc-b3e1-4f40-b714-b76a4b272dbf';
UPDATE contacts SET full_name = 'Зухра Исраилова'                       WHERE id = 'd6fca44f-c6b0-4621-a837-0354c72c49d9';
UPDATE contacts SET full_name = 'Юлия Владимировна Карабанова'          WHERE id = 'be55abc6-6de9-4d33-99e2-8efe8b06375f';
UPDATE contacts SET full_name = 'Кристина Георгиевна Карнаухова'        WHERE id = 'c26f0f51-2721-4fd8-968d-c9fcc63369af';
UPDATE contacts SET full_name = 'Лариса Изосимовна Касаткина'           WHERE id = 'ae49d770-9f90-4c01-9cf5-dccb0c0928c5';
UPDATE contacts SET full_name = 'Тамара Келигова'                       WHERE id = '648ce841-68fb-48df-a2c0-4cd500c08c4f';
UPDATE contacts SET full_name = 'Ольга Кислицына'                       WHERE id = 'bcfb4d45-1b9a-4923-9ee8-aedd429d79b0';
UPDATE contacts SET full_name = 'Арсен Койчуев'                         WHERE id = '7f35adb8-9adb-4e5c-914f-3e47b99743d6';
UPDATE contacts SET full_name = 'Олеся Колесова'                        WHERE id = '7a06b75b-c433-40c1-bb33-cfca60242849';
UPDATE contacts SET full_name = 'Эдуард Комаров'                        WHERE id = 'd8f5e604-c724-41f6-8ac4-3c0545da91cd';
UPDATE contacts SET full_name = 'Татьяна Кондратьева'                   WHERE id = 'd4060a7f-7aa9-49ba-a3f3-4c2084c7c342';
UPDATE contacts SET full_name = 'Анастасия Викторовна Копылова'         WHERE id = 'cc3ea06b-821f-47e2-9df6-84e357e258ab';
UPDATE contacts SET full_name = 'Ольга Владимировна Кравченко'          WHERE id = '62ffe7d3-3c84-44e7-bcab-3bd8f584ffae';
UPDATE contacts SET full_name = 'Татьяна Красниченко'                   WHERE id = '86ed63c0-a32d-409b-9b5e-ecae260ed051';
UPDATE contacts SET full_name = 'Алиетта Рустембековна Кривцова'        WHERE id = '83ec0424-0313-49a9-8180-363e2e8e7b6d';
UPDATE contacts SET full_name = 'Владимир Николаевич Кривцов'           WHERE id = '7b4dd036-8aa3-4bce-85bc-18f17c3adb97';
UPDATE contacts SET full_name = 'Инга Александровна Кузнецова'          WHERE id = '13c61215-3cbd-4432-84f0-bf40aac1e4ac';
UPDATE contacts SET full_name = 'Екатерина Владимировна Кузьмина'       WHERE id = 'f4ab1f6f-4c8c-4089-b590-30f807cae27c';
UPDATE contacts SET full_name = 'Ольга Сергеевна Кузьмина'              WHERE id = '436e82c7-4161-432e-ade7-a870ac795d11';
UPDATE contacts SET full_name = 'Людмила Кукушкина'                     WHERE id = '227dd4cb-4e0e-425d-b4ec-39c68b9671cd';
UPDATE contacts SET full_name = 'Станислав Константинович Кульков'      WHERE id = '45734dca-3221-491e-ac66-3e77456bba9c';
UPDATE contacts SET full_name = 'Тамара Руслановна Кысыр'               WHERE id = 'f45b4a82-3678-4d49-923e-51990f61d4e2';
UPDATE contacts SET full_name = 'Ирина Васильевна Лалиева'              WHERE id = '5cf6b2a2-ad5a-4cd7-84ff-85400a9b1302'; -- Лалиеаа → Лалиева (опечатка)
UPDATE contacts SET full_name = 'Ольга Алексеевна Лбова'                WHERE id = '70cc6f85-392e-47c6-87f7-58c62e305a50';
UPDATE contacts SET full_name = 'Ирина Николаевна Лелюхина'             WHERE id = '35215154-c77a-4143-8d77-9a56b5372832';
UPDATE contacts SET full_name = 'Ганна Маменко'                         WHERE id = 'de4a16d5-b609-425d-8d34-99eb69d45965';
UPDATE contacts SET full_name = 'Игорь Маменко'                         WHERE id = '5b16ffc5-c13a-40e8-a27f-345d6a6b9117';
UPDATE contacts SET full_name = 'Татьяна Манукян'                       WHERE id = '73fe61ee-9532-433e-ab11-680d4ef9e9ce';
UPDATE contacts SET full_name = 'Александр Манченко'                    WHERE id = '300ea8bf-cefe-4977-a28f-7825c7be7772';
UPDATE contacts SET full_name = 'Умакусум Гусейновна Маргимова'         WHERE id = '2a68fb9a-a671-455b-99e7-bf39c55e05ad';
UPDATE contacts SET full_name = 'Анастасия Александровна Мартынова'     WHERE id = '7fe9e1f8-14e6-44a6-a427-786ab3dacf93';
UPDATE contacts SET full_name = 'Дмитрий Александрович Марченко'        WHERE id = '82b39b99-bebb-44b7-9377-5b5d213fd40c';
UPDATE contacts SET full_name = 'Александр Витальевич Маслов'           WHERE id = '9477d97a-8b3c-4af2-ab0f-7f0bc83c0cb4';
UPDATE contacts SET full_name = 'Оксана Алексеевна Маслова'             WHERE id = '4b670eec-7fb2-46d1-8740-47c46e0a84b3';
UPDATE contacts SET full_name = 'Наталия Махаева'                       WHERE id = 'e69e2725-5727-4a85-a228-16025981708d';
UPDATE contacts SET full_name = 'Эдуард Петрович Межецкий'              WHERE id = '44bc508d-764e-4471-9a85-d7a622c7e2b9';
UPDATE contacts SET full_name = 'Елена Мельник'                         WHERE id = '6e21773e-81e8-476f-9989-48823fd8d28e';
UPDATE contacts SET full_name = 'Николай Сергеевич Меркоев'             WHERE id = 'fed3ce13-7ab7-4e7f-8893-5cca081bc617';
UPDATE contacts SET full_name = 'Алексей Милютин'                       WHERE id = 'a65c98a1-3650-4664-9809-e1c58b1fad5c';
UPDATE contacts SET full_name = 'Елизавета Валентиновна Мищенко'        WHERE id = '535d46d3-dca9-4d9e-af6d-b9462f7187e4';
UPDATE contacts SET full_name = 'Андрей Геннадьевич Мозгалин'           WHERE id = 'e145266e-8a61-41bc-8339-0cf17a69f900';
UPDATE contacts SET full_name = 'Людмила Моисеенко'                     WHERE id = '707fda93-bd34-4892-a56d-425d63216ce2';
UPDATE contacts SET full_name = 'Наталья Викторовна Мокшина'            WHERE id = '49d72cb9-db9c-4eaa-bb69-8645fa7238a2';
UPDATE contacts SET full_name = 'Наталья Викторовна Мокшина'            WHERE id = '5b4f3dea-9caf-4a6d-b03b-1ec372071128';
UPDATE contacts SET full_name = 'Наталья Борисовна Молчанова'           WHERE id = 'e9f9adaf-facf-46d3-a6a5-4abdae12063a';
UPDATE contacts SET full_name = 'Пира Исламовна Мусаева'                WHERE id = 'f167d681-f996-4f70-9ea4-54b945c85559';
UPDATE contacts SET full_name = 'Батибат Магомедариповна Муслимова'     WHERE id = '4230284e-9e8d-48bf-abd2-63770ab8bcb0';
UPDATE contacts SET full_name = 'Нина Александровна Мусохранова'        WHERE id = 'bc0b017d-b152-435d-a2f3-200b394a9abf';
UPDATE contacts SET full_name = 'Камила Багаутдиновна Муталимова'       WHERE id = '4f85d6fa-fdad-432c-b031-3a08c1af2ee8';
UPDATE contacts SET full_name = 'Анна Сергеевна Мухамеджанова'          WHERE id = 'ce9477f1-2601-4688-b24f-809d01a09022';
UPDATE contacts SET full_name = 'Мялх-Азни Асламбековна Пешхоева'       WHERE id = '25be625c-3cfb-47f9-a0af-7072b32c1702'; -- оставляем как есть, порядок уже верный
UPDATE contacts SET full_name = 'Рамин Рафигович Наджафов'              WHERE id = '419213c3-ffbf-406f-a9a2-6e5cefa63dc1';
UPDATE contacts SET full_name = 'Александр Павлович Наумов'             WHERE id = '099b4ca8-1f66-4f8a-8a7d-e782bb3f1834';
UPDATE contacts SET full_name = 'Константин Владимирович Нелип'         WHERE id = 'c573f787-3f3b-4bb7-ae85-17b4c624d9cb';
UPDATE contacts SET full_name = 'Алия Джолдибаевна Нурутдинова'         WHERE id = '5c3971bf-747c-48dd-add8-2a4c926a91cb';
UPDATE contacts SET full_name = 'Юлия Александровна Нюшко'              WHERE id = '49517cdd-7dc8-4182-a159-707493a45096';
UPDATE contacts SET full_name = 'Анастасия Александровна Оглоблина'     WHERE id = 'd8aaa74a-80a4-4ce9-a834-1f04e53c0d5a';
UPDATE contacts SET full_name = 'Диана Гаджимурадовна Омарова'          WHERE id = 'de6f200d-7ff8-4b6a-b098-eecbde8f69b4';
UPDATE contacts SET full_name = 'Заира Абдулаевна Омарова'              WHERE id = '4f55958e-9b32-4eb0-ac2b-a678a87a7af2';
UPDATE contacts SET full_name = 'Гульзат Калыбековна Омурзакова'        WHERE id = 'a1afec6e-71da-4266-a528-efd72d3cf7a9';
UPDATE contacts SET full_name = 'Виктория Владимировна Павлович'        WHERE id = '26b051b5-a636-40cf-8ce4-ebc3f8eb610e';
UPDATE contacts SET full_name = 'Даниил Сергеевич Паниев'               WHERE id = 'e5b6ad81-147a-4acd-ae96-f89a331c823b';
UPDATE contacts SET full_name = 'Елизавета Пахолик'                     WHERE id = 'f2f6e272-7de2-4c1b-afc8-daacb1615efe';
UPDATE contacts SET full_name = 'Ирина Игоревна Пескова'                WHERE id = 'ecc56fdd-21c0-435e-8c51-b6dc6634e795';
UPDATE contacts SET full_name = 'Ольга Пестова'                         WHERE id = '9e585514-5aaf-4a13-929d-88614ec7c649';
UPDATE contacts SET full_name = 'Александр Александрович Поддубный'     WHERE id = 'df4aa2dc-0739-49eb-b1a0-1d13ab4763de';
UPDATE contacts SET full_name = 'Артур Валерьевич Пономарев'            WHERE id = '2b4e3e32-3bc5-4a53-860f-32b3b9e7b671';
UPDATE contacts SET full_name = 'Екатерина Юрьевна Прокофьева'          WHERE id = '832cbf40-6fef-4609-b30c-6b35be64da80';
UPDATE contacts SET full_name = 'Виталий Алексеевич Пынзарь'            WHERE id = '2602a854-851f-44e4-a3ac-69fb60747f7a';
UPDATE contacts SET full_name = 'Илья Расторгуев'                       WHERE id = '274838a0-67fc-4b84-a85a-66dedf5eb67c';
UPDATE contacts SET full_name = 'Виталий Владимирович Резниченко'       WHERE id = 'e17c7022-ed68-4547-bda3-5c3d0e789ac2';
UPDATE contacts SET full_name = 'Мария Рубан'                           WHERE id = '7a32f8e5-605f-4b62-9b2a-373c5f0f6588';
UPDATE contacts SET full_name = 'Светлана Руденко'                      WHERE id = '46915f46-375f-49fa-bdc8-0a248f8d0807';
UPDATE contacts SET full_name = 'Наталья Игоревна Румянцева'            WHERE id = 'eebe1355-d12a-4c59-95dd-2cea1f2179e4';
UPDATE contacts SET full_name = 'Наталья Владимировна Рыкова'           WHERE id = '9f3782e2-64e6-4a9c-be0e-3e064dcba8e2';
UPDATE contacts SET full_name = 'Людмила Константиновна Савченко'       WHERE id = 'ba4bef28-8d64-4291-9495-922b77f238ee';
UPDATE contacts SET full_name = 'Александра Сагалаева'                  WHERE id = 'f8303932-4fed-4dcb-8779-26863251b61c';
UPDATE contacts SET full_name = 'Алексей Садов'                         WHERE id = '57c444af-7680-4562-90bf-29a2e1ebd5de';
UPDATE contacts SET full_name = 'Людмила Юрьевна Сальникова'            WHERE id = '5b7287a3-7943-49e3-b633-888b765336b4';
UPDATE contacts SET full_name = 'Асемгуль Саханова'                     WHERE id = 'f6d531fe-0bf6-4b6e-825c-af6c310d83c1';
UPDATE contacts SET full_name = 'Ольга Седова'                          WHERE id = 'cf7c083d-b545-4bcb-8e7b-424156a9099d';
UPDATE contacts SET full_name = 'Ирина Юрьевна Сиукаева'               WHERE id = 'c74a9348-752e-4918-8059-6e6d62f875c4';
UPDATE contacts SET full_name = 'Наталья Сергеевна Скопова'             WHERE id = 'a3d82859-d76b-467e-836c-0aaabbbe71da';
UPDATE contacts SET full_name = 'Евгений Валерьевич Смирнов'            WHERE id = '5c0b3848-843f-462d-8df3-27603429a863';
UPDATE contacts SET full_name = 'Екатерина Соколова'                    WHERE id = 'd1e3a8ab-19d4-4599-93f2-8c84c62bb028';
UPDATE contacts SET full_name = 'Елена Ступакова'                       WHERE id = '855d21c4-e9d6-4da1-b937-5d394eb76883';
UPDATE contacts SET full_name = 'Ольга Суркова'                         WHERE id = 'bef1cd45-3f45-4fc4-9d5c-4c38a615b20c';
UPDATE contacts SET full_name = 'Людмила Викторовна Суслова'            WHERE id = 'c97cfe6c-9471-4a20-8bbd-6dc5387e6cc9'; -- Сусловп→Суслова (опечатка)
UPDATE contacts SET full_name = 'Юлия Тазина'                           WHERE id = 'eee1085d-2098-4205-9a90-47d5efa0ad4b';
UPDATE contacts SET full_name = 'Фатима Тамаева'                        WHERE id = 'fbeec572-d324-4527-a8c2-d0852e7952c7';
UPDATE contacts SET full_name = 'Тигран Самвелович Тамазян'             WHERE id = '79e84ece-b0a1-4cbe-bc72-ef24e7a35ddc';
UPDATE contacts SET full_name = 'Эльнара Танривердиева'                 WHERE id = 'd0c5371b-c201-4ffc-ab7e-1fc13aea180d';
UPDATE contacts SET full_name = 'Екатерина Олеговна Татьмянина'         WHERE id = '46b75552-0851-4653-8129-2b1bdfad3af0';
UPDATE contacts SET full_name = 'Людмила Валентиновна Тишевская'        WHERE id = 'a71cbd84-22b5-4aa8-99ef-c2e9c32867af';
UPDATE contacts SET full_name = 'Екатерина Труфанова'                   WHERE id = '29736a41-5a68-4acc-b496-8938494a892d';
UPDATE contacts SET full_name = 'Оксана Александровна Туева'            WHERE id = 'a544a294-c7ed-4953-afd2-c33b057740d2';
UPDATE contacts SET full_name = 'Наталья Александровна Тычкова'         WHERE id = '84f6dfaf-9756-4dd8-9f55-3abaa3cb44a8';
UPDATE contacts SET full_name = 'Алина Уарова'                          WHERE id = 'bfe50c75-3246-4869-b8be-acb23ce50b63';
UPDATE contacts SET full_name = 'Стелла Узденова'                       WHERE id = 'b7d40375-e84a-470a-8a29-7ca7ec0feaf1';
UPDATE contacts SET full_name = 'Никита Игоревич Украинцев'             WHERE id = '2badf361-8ecd-4288-a4e6-bc82261ca472';
UPDATE contacts SET full_name = 'Варвара Фадина'                        WHERE id = '0e94150a-c490-42bc-b148-7b7ae796eb28';
UPDATE contacts SET full_name = 'Ирина Васильевна Федоренко'            WHERE id = 'a401c853-6adc-4ee8-9d0c-2d3c8154c4a7';
UPDATE contacts SET full_name = 'Анастасия Фенькина'                    WHERE id = 'a0b5ea1a-2a16-451a-83f8-ce39779c864d';
UPDATE contacts SET full_name = 'Василий Филимоненко'                   WHERE id = '9f2d0a97-0363-4c7e-9a35-babfdcd08e7b';
UPDATE contacts SET full_name = 'Айгуль Радиковна Хазиева'              WHERE id = 'f75c9433-54b3-4bdd-8868-273411df187b';
UPDATE contacts SET full_name = 'Екатерина Харакоз'                     WHERE id = '8758ec60-ee6b-42fa-94b8-95ed8f67dd06';
UPDATE contacts SET full_name = 'Виктория Хияева'                       WHERE id = '481802ef-a74e-4628-8f21-f3dcf3b9671b';
UPDATE contacts SET full_name = 'Зарина Цаликова'                       WHERE id = '1571b21b-2286-4b26-a81f-9e4b804e3a62';
UPDATE contacts SET full_name = 'Екатерина Цветкова'                    WHERE id = '26d64397-7ef9-4fd0-b91b-1502a7d9fdbe';
UPDATE contacts SET full_name = 'Владислав Юзефович Чайковский'         WHERE id = '7532d769-90ca-4676-aaae-8249dd9f2cfd';
UPDATE contacts SET full_name = 'Юлия Михайловна Чапурина'              WHERE id = 'ba7aaa3a-b0d3-428d-9f78-d8b5a7f86579';
UPDATE contacts SET full_name = 'Михаил Витальевич Чарный'              WHERE id = '82640870-8de5-42fb-be67-5dfe358fcbd3';
UPDATE contacts SET full_name = 'Елена Чацкис'                          WHERE id = '53174bab-cd9f-4436-934f-3befe23612a6';
UPDATE contacts SET full_name = 'Татьяна Чекмарева'                     WHERE id = '5441dd60-543c-4814-a943-82a4be0e2eab';
UPDATE contacts SET full_name = 'Ирина Черномазова'                     WHERE id = '0362ceb0-4b2c-4fdb-9468-161210330723';
UPDATE contacts SET full_name = 'Владимир Николаевич Черномазов'        WHERE id = '9f2de274-a34c-4243-b3a0-55f971b9a544';
UPDATE contacts SET full_name = 'Антонина Черчович'                     WHERE id = '57f6972f-a280-4408-b429-4dabf28f359e';
UPDATE contacts SET full_name = 'Михаил Алексеевич Чичканов'            WHERE id = '44084124-1a2b-4044-9f47-e94bb4763756';
UPDATE contacts SET full_name = 'Чолпон Сейитовна'                      WHERE id = '85f54a83-baa9-4784-b973-c6de0faec312'; -- только имя+отчество, фамилии нет
UPDATE contacts SET full_name = 'Анна Геннадьевна Шандра'               WHERE id = 'f51af7d4-7c43-47da-b06b-ba7188f64506';
UPDATE contacts SET full_name = 'Александр Анатольевич Шапкин'          WHERE id = 'bceebdbb-4cce-4427-87c8-b9e20a81fa89';
UPDATE contacts SET full_name = 'Мария Шатохина'                        WHERE id = '56170d6b-efca-42c8-a275-77bffdd58367';
UPDATE contacts SET full_name = 'Станислав Алексеевич Шацких'           WHERE id = '697eb66b-ba7c-4b42-9ba6-e46cfeff9f1d';
UPDATE contacts SET full_name = 'Олег Юрьевич Шевченко'                 WHERE id = '0c9edc1a-0fff-4a68-a404-b3fae0b5fbce';
UPDATE contacts SET full_name = 'Заира Шейхмагомедова'                  WHERE id = '9478adf8-dd72-4aa0-b081-fccc04765983';
UPDATE contacts SET full_name = 'Фатимат Чаримовна Шибзухова'           WHERE id = '78bb1113-ea68-4c41-a4b8-9267bc976733';
UPDATE contacts SET full_name = 'Светлана Николаевна Шкадрецова'        WHERE id = 'f2c7819c-aeb8-4275-bffd-62937c9f9dc4';
UPDATE contacts SET full_name = 'Юлия Шуст'                             WHERE id = '66db72c5-e6d1-4716-b6ca-d58b89612d8a'; -- "Шуст Юлия Шуст" — дублирование, оставляем Имя Фамилия
UPDATE contacts SET full_name = 'Юлия Щербань'                          WHERE id = 'a9faf67a-cfbb-487f-8daf-6180914edcd8'; -- ЩЕРБАНЬ Юлия → Юлия Щербань
UPDATE contacts SET full_name = 'Ольга Яковенко'                        WHERE id = 'cd5f08cd-5e50-455a-910d-8465a8074dd5';
UPDATE contacts SET full_name = 'Айшат Ярбилова'                        WHERE id = 'b80af985-9cd3-446c-9864-c13a33da41d8';

-- Ахмедова Заира → Заира Ахмедова
UPDATE contacts SET full_name = 'Заира Ахмедова'                        WHERE id = '545da568-2c4c-4743-a998-cc673a498965';
-- Ахмет Гасанов — порядок уже верный (Имя Фамилия), оставить
-- Гульминат Гасанова — дубликат (два контакта!)
-- Оставляем один (5d093a52), второй (57d810b6) — проверим email/телефон: оставляем оба, просто нормализуем имя
UPDATE contacts SET full_name = 'Гульминат Гасанова'                    WHERE id = '5d093a52-7364-4ac8-90d6-7286af95e0ae';
UPDATE contacts SET full_name = 'Гульминат Гасанова'                    WHERE id = '57d810b6-0bbb-40ae-9b47-00ac02efd0c1';
-- Довгополый Артём → Артём Довгополый
UPDATE contacts SET full_name = 'Артём Довгополый'                      WHERE id = '65dff2e2-09e0-46e5-b19a-77fad6b7c3d9';
-- Марина Олеговна Ращук — порядок Имя Отчество Фамилия, уже верный
-- Максим Николаевич Гарькавенко — порядок уже верный
-- Оксана Александровна Шипицына — уже верный
-- Ольга Алексеевна Мажарова — уже верный
-- Павел Юрьевич Смирнов — уже верный
-- Игорь Владимирович — только имя+отчество, ок
-- Евгений Станиславович — только имя+отчество, ок
-- Алексей Николаевич — только имя+отчество, ок
-- Кирилл Александрович — только имя+отчество, ок
-- Зухра Шомурадовна — только имя+отчество, ок
-- Клавдия Владиславовна — только имя+отчество, ок
-- Саид Гамзатович — только имя+отчество, ок
-- Мялх-Азни Асламбековна Пешхоева — уже ИОФ

-- Гульминат Гасанова — дубликат: оставляем с телефоном (57d810b6), удаляем без телефона (5d093a52)
DELETE FROM contacts WHERE id = '5d093a52-7364-4ac8-90d6-7286af95e0ae'; -- дубль без телефона
UPDATE contacts SET full_name = 'Гульминат Гасанова' WHERE id = '57d810b6-0bbb-40ae-9b47-00ac02efd0c1';

-- Гурами Елгулжаевич Кветенадзе
UPDATE contacts SET full_name = 'Гурами Елгулжаевич Кветенадзе'         WHERE id = 'd0b4320d-d9f9-4b10-8541-dd177264915b';

-- Ирина Николаевна Мамай
UPDATE contacts SET full_name = 'Ирина Николаевна Мамай'                WHERE id = '25fc8ca7-d6d9-4561-9dc8-11bbeec6802e';

-- Владимир Дмитриевич Югай
UPDATE contacts SET full_name = 'Владимир Дмитриевич Югай'              WHERE id = '2cf46fb0-dc8c-4a73-a14d-ab4e8c37dbee';

-- Надежда Юдина
UPDATE contacts SET full_name = 'Надежда Юдина'                         WHERE id = 'e0c02163-4acc-4a96-97a7-b858e7b6c418';

COMMIT;
