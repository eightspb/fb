-- Обновление email шаблона для регистрации на конференцию (администратор)
-- Добавляем поле города и убираем поле сертификата

UPDATE email_templates 
SET html_body = '<h2>Новая регистрация на конференцию</h2>
<p><strong>Конференция:</strong> {{conference}}</p>
<p><strong>ФИО:</strong> {{name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Телефон:</strong> {{phone}}</p>
{{#if city}}<p><strong>Город:</strong> {{city}}</p>{{/if}}
{{#if institution}}<p><strong>Учреждение:</strong> {{institution}}</p>{{/if}}
<p><strong>Дата регистрации:</strong> {{date}}</p>'
WHERE form_type = 'conference_registration' AND email_type = 'admin';
