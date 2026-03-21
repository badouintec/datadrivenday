import { defineField, defineType } from 'sanity';

export const eventSettingsType = defineType({
  name: 'eventSettings',
  title: 'Event settings',
  type: 'document',
  fields: [
    defineField({
      name: 'eventName',
      title: 'Event name',
      type: 'string',
      validation: (rule) => rule.required()
    }),
    defineField({
      name: 'eventDate',
      title: 'Event date',
      type: 'date'
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string'
    }),
    defineField({
      name: 'registrationUrl',
      title: 'Registration URL',
      type: 'url'
    }),
    defineField({
      name: 'heroMessage',
      title: 'Hero message',
      type: 'text',
      rows: 4
    })
  ]
});
