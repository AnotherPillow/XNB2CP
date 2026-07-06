const supported_languages = {
    'en': {
        "flag": "🇬🇧"
    },
    'de': {
        "flag": "🇩🇪"
    },
    'pl': {
        "flag": "🇵🇱"
    },
    'ru': {
        "flag": "🇷🇺"
    },
    'nl': {
        "flag": "🇳🇱"
    },
}

const lang = navigator.language.split('-')[0]


window.loadTranslations = async (_lang = lang) => {
    window.xtranslations = await new Promise(async (resolve, reject) => {
        const url1 = `/i18n/${_lang}.json`
        const url2 = '/i18n/en.json';
        
        let translations = {};
        
        if (_lang in supported_languages && _lang !== 'en') {
            const response1 = await fetch(url1);
            
            if (response1.ok) translations = await response1.json();
        }
        
        const response2 = await fetch(url2);
        
        if (response2.ok) {
            const englishTranslations = await response2.json();
            translations = { ...englishTranslations, ...translations };
        }
        
        if (Object.keys(translations).length > 0) {
            resolve(translations);
        } else {
            reject(null);
        }
    })
    
    
    console.log(xtranslations)
    document.querySelectorAll('[data-translation-key]').forEach(el => {
        const key = el.getAttribute('data-translation-key')
        const translation = xtranslations[key]
        if (key.includes('placeholder-value')) {
            el.setAttribute('placeholder', translation)
            el.value = translation
        } else if (key.includes('value')) {
            el.value = translation
        } else {
            el.innerHTML = translation
        }
        
    })
}

loadTranslations(localStorage.getItem('chosen-language') ?? lang)