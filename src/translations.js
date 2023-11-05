const lang = navigator.language.split('-')[0]
const translations = await new Promise(async (resolve, reject) => {
    const url1 = `/i18n/${lang}.json`
    const url2 = '/i18n/en.json';
  
    try {
        const response1 = await fetch(url1);
    
        if (response1.ok) {
            // If the first URL exists, return its JSON content
            resolve(await response1.json())
            return;
        }
    } catch (error) {
        // An error occurred while fetching the first URL
        console.error(error);
    }
  
    try {
        const response2 = await fetch(url2);
    
        if (response2.ok) {
            resolve(await response2.json())
            return;
        }
    } catch (error) {
        alert('Failed to load both local translations and English.')
        reject(null)
    }
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