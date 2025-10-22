// Translations module for Yappin'
// Supports English (default) and Dutch
// Never translates: Yappin', yap, reyap, and any variations

const translations = {
    en: {
        // Navigation
        home: 'Home',
        explore: 'Explore',
        notifications: 'Notifications',
        messages: 'Messages',
        bookmarks: 'Bookmarks',
        profile: 'Profile',
        groups: 'Groups',
        settings: 'Settings',
        
        // Actions
        follow: 'Follow',
        following: 'Following',
        unfollow: 'Unfollow',
        like: 'Like',
        reply: 'Reply',
        share: 'Share',
        bookmark: 'Bookmark',
        delete: 'Delete',
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        send: 'Send',
        post: 'Post',
        create: 'Create',
        join: 'Join',
        leave: 'Leave',
        
        // Post/Yap related (keep yap terms)
        whatsHappening: "What's happening?",
        showReplies: 'Show replies',
        hideReplies: 'Hide replies',
        noRepliesYet: 'No replies yet',
        loadingReplies: 'Loading replies...',
        errorLoadingReplies: 'Error loading replies',
        replyingTo: 'Replying to',
        allowOthersToReyap: 'Allow others to reyap this post',
        reyapsDisabled: 'Reyaps disabled by author',
        youReyapped: 'You reyapped',
        
        // Notifications
        noNotifications: 'No notifications yet',
        mentionedYou: 'mentioned you',
        likedYour: 'liked your',
        reyappedYour: 'reyapped your',
        followedYou: 'followed you',
        repliedTo: 'replied to',
        
        // Profile
        followers: 'Followers',
        joined: 'Joined',
        bio: 'Bio',
        editProfile: 'Edit Profile',
        displayName: 'Display Name',
        username: 'Username',
        location: 'Location',
        website: 'Website',
        profilePicture: 'Profile Picture',
        
        // Groups
        createGroup: 'Create Group',
        groupName: 'Group Name',
        groupDescription: 'Group Description',
        groupTopic: 'Group Topic',
        groupImage: 'Group Image',
        publicGroup: 'Public Group',
        privateGroup: 'Private Group',
        members: 'Members',
        myGroups: 'My Groups',
        discoverGroups: 'Discover Groups',
        groupSettings: 'Group Settings',
        manageMembers: 'Manage Members',
        leaveGroup: 'Leave Group',
        deleteGroup: 'Delete Group',
        
        // Settings
        accountSettings: 'Account Settings',
        privacySettings: 'Privacy & Safety',
        notificationSettings: 'Notification Settings',
        language: 'Language',
        theme: 'Theme',
        lightMode: 'Light Mode',
        darkMode: 'Dark Mode',
        autoDetect: 'Auto Detect',
        
        // Auth
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        signInWithGoogle: 'Sign in with Google',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        
        // Invites
        sendInvites: 'Send Invites',
        inviteFriends: 'Invite Friends',
        emailAddresses: 'Email Addresses',
        sendInvite: 'Send Invite',
        inviteSent: 'Invite sent successfully',
        
        // Messages
        directMessages: 'Direct Messages',
        newMessage: 'New Message',
        typeMessage: 'Type a message...',
        noMessages: 'No messages yet',
        startConversation: 'Start a conversation',
        
        // Search & Discovery
        search: 'Search',
        searchUsers: 'Search users...',
        whoToFollow: 'Who to follow',
        trendingHashtags: 'Trending Hashtags',
        suggestedUsers: 'Suggested Users',
        
        // Errors & Messages
        error: 'Error',
        success: 'Success',
        loading: 'Loading...',
        tryAgain: 'Try again',
        somethingWentWrong: 'Something went wrong',
        pleaseSignIn: 'Please sign in',
        noResultsFound: 'No results found',
        
        // Time
        now: 'now',
        minuteAgo: 'minute ago',
        minutesAgo: 'minutes ago',
        hourAgo: 'hour ago',
        hoursAgo: 'hours ago',
        dayAgo: 'day ago',
        daysAgo: 'days ago',
        
        // Misc
        or: 'or',
        and: 'and',
        more: 'More',
        less: 'Less',
        showMore: 'Show more',
        showLess: 'Show less',
        comingSoon: 'Coming soon!',
        featureComingSoon: 'This feature is coming soon!',
        
        // Additional UI elements
        appSettings: 'App Settings',
        appearance: 'Appearance',
        about: 'About',
        help: 'Help',
        feedback: 'Feedback',
        version: 'Version',
        termsOfService: 'Terms of Service',
        privacyPolicy: 'Privacy Policy',
        logOut: 'Log Out',
        confirm: 'Confirm',
        areYouSure: 'Are you sure?',
        yes: 'Yes',
        no: 'No',
        
        // Group-specific
        searchGroups: 'Search groups...',
        noGroupsFound: 'No groups found',
        loadingGroups: 'Loading groups...',
        requestToJoin: 'Request to Join',
        pendingRequest: 'Request Pending',
        joinRequests: 'Join Requests',
        approve: 'Approve',
        reject: 'Reject',
        noJoinRequests: 'No pending join requests',
        postInGroup: 'Post in group',
        noYapsYet: 'No yaps yet. Be the first to post!',
        admin: 'Admin',
        member: 'Member',
        
        // Media
        addPhoto: 'Add photo',
        addGif: 'Add GIF',
        addEmoji: 'Add emoji',
        attachImage: 'Attach image',
        removeImage: 'Remove image',
        
        // Profile tabs
        yaps: 'Yaps',
        replies: 'Replies',
        media: 'Media',
        likes: 'Likes'
    },
    
    nl: {
        // Navigation
        home: 'Home',
        explore: 'Verkennen',
        notifications: 'Meldingen',
        messages: 'Berichten',
        bookmarks: 'Bladwijzers',
        profile: 'Profiel',
        groups: 'Groepen',
        settings: 'Instellingen',
        
        // Actions
        follow: 'Volgen',
        following: 'Volgend',
        unfollow: 'Ontvolgen',
        like: 'Vind ik leuk',
        reply: 'Reageren',
        share: 'Delen',
        bookmark: 'Bladwijzer',
        delete: 'Verwijderen',
        edit: 'Bewerken',
        save: 'Opslaan',
        cancel: 'Annuleren',
        close: 'Sluiten',
        send: 'Verzenden',
        post: 'Plaatsen',
        create: 'Aanmaken',
        join: 'Deelnemen',
        leave: 'Verlaten',
        
        // Post/Yap related (keep yap terms)
        whatsHappening: 'Wat gebeurt er?',
        showReplies: 'Reacties tonen',
        hideReplies: 'Reacties verbergen',
        noRepliesYet: 'Nog geen reacties',
        loadingReplies: 'Reacties laden...',
        errorLoadingReplies: 'Fout bij laden reacties',
        replyingTo: 'Reageert op',
        allowOthersToReyap: 'Anderen toestaan om te reyappen',
        reyapsDisabled: 'Reyaps uitgeschakeld door auteur',
        youReyapped: 'Jij hebt gereyapt',
        
        // Notifications
        noNotifications: 'Nog geen meldingen',
        mentionedYou: 'noemde jou',
        likedYour: 'vond je leuk',
        reyappedYour: 'heeft gereyapt',
        followedYou: 'volgt jou',
        repliedTo: 'reageerde op',
        
        // Profile
        followers: 'Volgers',
        joined: 'Lid sinds',
        bio: 'Bio',
        editProfile: 'Profiel bewerken',
        displayName: 'Weergavenaam',
        username: 'Gebruikersnaam',
        location: 'Locatie',
        website: 'Website',
        profilePicture: 'Profielfoto',
        
        // Groups
        createGroup: 'Groep aanmaken',
        groupName: 'Groepsnaam',
        groupDescription: 'Groepsbeschrijving',
        groupTopic: 'Groepsonderwerp',
        groupImage: 'Groepsafbeelding',
        publicGroup: 'Openbare groep',
        privateGroup: 'Privégroep',
        members: 'Leden',
        myGroups: 'Mijn groepen',
        discoverGroups: 'Groepen ontdekken',
        groupSettings: 'Groepsinstellingen',
        manageMembers: 'Leden beheren',
        leaveGroup: 'Groep verlaten',
        deleteGroup: 'Groep verwijderen',
        
        // Settings
        accountSettings: 'Accountinstellingen',
        privacySettings: 'Privacy & Veiligheid',
        notificationSettings: 'Meldingsinstellingen',
        language: 'Taal',
        theme: 'Thema',
        lightMode: 'Lichte modus',
        darkMode: 'Donkere modus',
        autoDetect: 'Automatisch detecteren',
        
        // Auth
        signIn: 'Inloggen',
        signUp: 'Registreren',
        signOut: 'Uitloggen',
        signInWithGoogle: 'Inloggen met Google',
        email: 'E-mail',
        password: 'Wachtwoord',
        forgotPassword: 'Wachtwoord vergeten?',
        
        // Invites
        sendInvites: 'Uitnodigingen versturen',
        inviteFriends: 'Vrienden uitnodigen',
        emailAddresses: 'E-mailadressen',
        sendInvite: 'Uitnodiging versturen',
        inviteSent: 'Uitnodiging succesvol verzonden',
        
        // Messages
        directMessages: 'Directe berichten',
        newMessage: 'Nieuw bericht',
        typeMessage: 'Typ een bericht...',
        noMessages: 'Nog geen berichten',
        startConversation: 'Begin een gesprek',
        
        // Search & Discovery
        search: 'Zoeken',
        searchUsers: 'Gebruikers zoeken...',
        whoToFollow: 'Wie te volgen',
        trendingHashtags: 'Trending hashtags',
        suggestedUsers: 'Aanbevolen gebruikers',
        
        // Errors & Messages
        error: 'Fout',
        success: 'Succes',
        loading: 'Laden...',
        tryAgain: 'Opnieuw proberen',
        somethingWentWrong: 'Er ging iets mis',
        pleaseSignIn: 'Log alsjeblieft in',
        noResultsFound: 'Geen resultaten gevonden',
        
        // Time
        now: 'nu',
        minuteAgo: 'minuut geleden',
        minutesAgo: 'minuten geleden',
        hourAgo: 'uur geleden',
        hoursAgo: 'uur geleden',
        dayAgo: 'dag geleden',
        daysAgo: 'dagen geleden',
        
        // Misc
        or: 'of',
        and: 'en',
        more: 'Meer',
        less: 'Minder',
        showMore: 'Meer tonen',
        showLess: 'Minder tonen',
        comingSoon: 'Komt binnenkort!',
        featureComingSoon: 'Deze functie komt binnenkort!',
        
        // Additional UI elements
        appSettings: 'App-instellingen',
        appearance: 'Uiterlijk',
        about: 'Over',
        help: 'Hulp',
        feedback: 'Feedback',
        version: 'Versie',
        termsOfService: 'Servicevoorwaarden',
        privacyPolicy: 'Privacybeleid',
        logOut: 'Uitloggen',
        confirm: 'Bevestigen',
        areYouSure: 'Weet je het zeker?',
        yes: 'Ja',
        no: 'Nee',
        
        // Group-specific
        searchGroups: 'Groepen zoeken...',
        noGroupsFound: 'Geen groepen gevonden',
        loadingGroups: 'Groepen laden...',
        requestToJoin: 'Verzoek om toe te treden',
        pendingRequest: 'Verzoek in behandeling',
        joinRequests: 'Deelnameaanvragen',
        approve: 'Goedkeuren',
        reject: 'Afwijzen',
        noJoinRequests: 'Geen hangende aanvragen',
        postInGroup: 'Plaatsen in groep',
        noYapsYet: 'Nog geen yaps. Wees de eerste om te posten!',
        admin: 'Beheerder',
        member: 'Lid',
        
        // Media
        addPhoto: 'Foto toevoegen',
        addGif: 'GIF toevoegen',
        addEmoji: 'Emoji toevoegen',
        attachImage: 'Afbeelding bijvoegen',
        removeImage: 'Afbeelding verwijderen',
        
        // Profile tabs
        yaps: 'Yaps',
        replies: 'Reacties',
        media: 'Media',
        likes: 'Vind-ik-leuks'
    }
};
};

// Current language state
let currentLanguage = 'en';

/**
 * Detect browser/OS language preference
 * @returns {string} Language code (en or nl)
 */
function detectLanguage() {
    // Check if user has previously set a preference
    const savedLanguage = localStorage.getItem('yappin_language');
    if (savedLanguage && translations[savedLanguage]) {
        return savedLanguage;
    }
    
    // Detect from browser
    const browserLang = navigator.language || navigator.userLanguage;
    
    // Check if it's Dutch
    if (browserLang.toLowerCase().startsWith('nl')) {
        return 'nl';
    }
    
    // Default to English
    return 'en';
}

/**
 * Get translated text for a key
 * @param {string} key - Translation key
 * @param {object} replacements - Optional object with values to replace in translation
 * @returns {string} Translated text
 */
function t(key, replacements = {}) {
    const translation = translations[currentLanguage]?.[key] || translations.en[key] || key;
    
    // Replace placeholders if any
    let result = translation;
    for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replace(`{${placeholder}}`, value);
    }
    
    return result;
}

/**
 * Set the current language
 * @param {string} langCode - Language code (en or nl)
 */
function setLanguage(langCode) {
    if (!translations[langCode]) {
        console.warn(`Language '${langCode}' not supported, using English`);
        langCode = 'en';
    }
    
    currentLanguage = langCode;
    localStorage.setItem('yappin_language', langCode);
    
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
    
    // Trigger translation update event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
}

/**
 * Get current language
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * Translate all elements with data-i18n attribute
 */
function translatePage() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        
        // Check if we should translate as placeholder
        if (element.hasAttribute('data-i18n-placeholder')) {
            element.placeholder = translation;
        } else if (element.hasAttribute('data-i18n-title')) {
            element.title = translation;
        } else if (element.hasAttribute('data-i18n-aria-label')) {
            element.setAttribute('aria-label', translation);
        } else {
            element.textContent = translation;
        }
    });
    
    // Translate elements with data-i18n-html (allows HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        element.innerHTML = t(key);
    });
}

/**
 * Initialize translations on page load
 */
function initTranslations() {
    // Detect and set language
    const detectedLang = detectLanguage();
    setLanguage(detectedLang);
    
    // Translate the page
    translatePage();
    
    // Re-translate when language changes
    window.addEventListener('languageChanged', translatePage);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslations);
} else {
    initTranslations();
}

// Export functions for use in other modules
window.t = t;
window.setLanguage = setLanguage;
window.getCurrentLanguage = getCurrentLanguage;
window.translatePage = translatePage;
