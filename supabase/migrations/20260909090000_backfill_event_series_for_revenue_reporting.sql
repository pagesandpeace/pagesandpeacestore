update app_core.events
set series_name = case
  when lower(title) like '%silent reading%' then 'Silent Read'
  when lower(title) like '%medium%' then 'Mediumship'
  when lower(title) like '%d&d%' or lower(title) like '%d & d%' then 'D&D'
  when lower(title) like '%bingo%' then 'Bingo'
  when lower(title) like '%bookish creative%' then 'Bookish Creative Club'
  when lower(title) like '%book of the month%' then 'Book of the Month Book Club'
  when lower(title) like '%monthly chapter%' then 'Monthly Chapter Book Club'
  when lower(title) like '%book chatter%' then 'Book Chatter Club'
  when lower(title) like '%dark romance book club%' then 'Dark Romance Book Club'
  when lower(title) like '%quiz night%' then 'Quiz Night'
  when lower(title) like '%pamper night%' then 'Pamper Night'
  when lower(title) like '%paint & sip%' then 'Paint & Sip'
  when lower(title) like '%secret hungry hippo%' then 'Secret Hungry Hippo'
  else series_name
end,
updated_at = now()
where
  lower(title) like '%silent reading%'
  or lower(title) like '%medium%'
  or lower(title) like '%d&d%'
  or lower(title) like '%d & d%'
  or lower(title) like '%bingo%'
  or lower(title) like '%bookish creative%'
  or lower(title) like '%book of the month%'
  or lower(title) like '%monthly chapter%'
  or lower(title) like '%book chatter%'
  or lower(title) like '%dark romance book club%'
  or lower(title) like '%quiz night%'
  or lower(title) like '%pamper night%'
  or lower(title) like '%paint & sip%'
  or lower(title) like '%secret hungry hippo%';
