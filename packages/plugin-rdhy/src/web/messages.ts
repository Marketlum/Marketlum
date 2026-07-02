/**
 * Plugin-owned i18n catalogs. Plain data (no React) so they can be merged into
 * the host app's next-intl dictionary server-side under `plugin.rdhy.*`.
 */
export const rdhyMessages = {
  en: {
    nav: {
      group: 'RenDanHeYi',
      platforms: 'Platforms',
    },
    platforms: {
      title: 'Platforms',
      description: 'RenDanHeYi platforms hosting value streams.',
      code: 'Code',
      name: 'Name',
      members: 'Value streams',
      create: 'New platform',
      createTitle: 'Create platform',
      editTitle: 'Edit platform',
      descriptionLabel: 'Description',
      save: 'Save',
      cancel: 'Cancel',
      empty: 'No platforms yet.',
      failed: 'Request failed',
      open: 'Open',
    },
    detail: {
      back: 'Platforms',
      edit: 'Edit',
      delete: 'Delete',
      deleteTitle: 'Delete platform',
      deleteDescription:
        'The platform will be removed and its member value streams become unassigned.',
      membersTitle: 'Member value streams',
      level: 'Level',
      remove: 'Remove',
      noMembers: 'No value streams assigned yet.',
      addLabel: 'Add value stream',
      addPlaceholder: 'Search value streams…',
      add: 'Add',
      noMatches: 'No matching value streams.',
    },
  },
  pl: {
    nav: {
      group: 'RenDanHeYi',
      platforms: 'Platformy',
    },
    platforms: {
      title: 'Platformy',
      description: 'Platformy RenDanHeYi grupujące strumienie wartości.',
      code: 'Kod',
      name: 'Nazwa',
      members: 'Strumienie wartości',
      create: 'Nowa platforma',
      createTitle: 'Utwórz platformę',
      editTitle: 'Edytuj platformę',
      descriptionLabel: 'Opis',
      save: 'Zapisz',
      cancel: 'Anuluj',
      empty: 'Brak platform.',
      failed: 'Żądanie nie powiodło się',
      open: 'Otwórz',
    },
    detail: {
      back: 'Platformy',
      edit: 'Edytuj',
      delete: 'Usuń',
      deleteTitle: 'Usuń platformę',
      deleteDescription:
        'Platforma zostanie usunięta, a jej strumienie wartości przestaną być przypisane.',
      membersTitle: 'Przypisane strumienie wartości',
      level: 'Poziom',
      remove: 'Usuń',
      noMembers: 'Brak przypisanych strumieni wartości.',
      addLabel: 'Dodaj strumień wartości',
      addPlaceholder: 'Szukaj strumieni wartości…',
      add: 'Dodaj',
      noMatches: 'Brak pasujących strumieni wartości.',
    },
  },
};
