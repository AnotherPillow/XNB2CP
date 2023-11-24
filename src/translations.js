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
}

const lang = navigator.language.split('-')[0]

window.loadTranslations = async (_lang = lang) => {
    const translations = await new Promise(async (resolve, reject) => {
        const url1 = `/i18n/${_lang}.json`
        const url2 = '/i18n/en.json';
    
        if (lang in supported_languages) {
            const response1 = await fetch(url1);
        
            if (response1.ok) {
                // If the first URL exists, return its JSON content
                resolve(await response1.json())
                return;
            }
        } else {
            const response2 = await fetch(url2);
        
            if (response2.ok) {
                resolve(await response2.json())
                return;
            }
        }
      
        reject(null)
        
    })
    
    console.log(translations)
    document.querySelectorAll('[data-translation-key]').forEach(el => {
        const key = el.getAttribute('data-translation-key')
        const translation = translations[key]
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

loadTranslations()