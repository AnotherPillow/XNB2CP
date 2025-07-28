/// <reference path="imports.js" />
/// <reference path="translations.js" />
/// <reference path="util.js" />
/// <reference path="patcher.js" />

const modfileinput = document.querySelector('#xnb-file-input');
const contentfileinput = document.querySelector('#content-file-input');
const filedisabler_overlay = document.querySelector('.file-disabler');
const fileupload_btn = document.querySelector('#mod-file-btn');
const contentfileupload_btn = document.querySelector('#content-file-btn');
const filecancel_btn = document.querySelector('.file-cancel-btn');
const filecancel_btn_overlay = document.querySelector('.file-cancel-btn-overlay');
const done_btn = document.querySelector('#done-btn');
const manifest_form = document.querySelector('#manifest-form');
const manifest_form_submit = document.querySelector('#manifest-form-submit');
const file_table = document.querySelector('#file-table');
const file_table_tbody = document.querySelector('#file-table tbody');
const file_download_area = document.querySelector('#file-download-area');
const file_area_topbottom_seperator = document.querySelector('#file-area-topbottom-seperator');
const file_area_bottom = document.querySelector('.file-area-bottom');
const github_link = document.querySelector('.github-link i');
const language_btn = document.querySelector('.language-btn i');
const language_button = document.querySelector('.language-btn');
const language_popup = document.querySelector('#language-popup');
const language_list = document.querySelector('#languages');
const img_diff_canvas = document.querySelector('#image-diff-holder')

manifest_form.addEventListener('submit', function (e) {
    e.preventDefault();
    convert();
});

done_btn.addEventListener('click', function () {
    manifest_form_submit.click();
});

const file_area_topbottom_seperator_bottom = file_area_topbottom_seperator.getBoundingClientRect().bottom;
const columns_right_bottom = document.querySelector('.column.right').getBoundingClientRect().bottom;
const file_area_bottom_size = columns_right_bottom - file_area_topbottom_seperator_bottom;

file_area_bottom.setAttribute('style', `height: ${file_area_bottom_size}px;`);

/**
 * @param {string} cut_path 
 * @param {Blob} blob 
 */
function getNonXnbExtension(cut_path, blob) {
    console.log('blob type: ', blob.type)
    const newExtension = {
        'Texture2D': '.png',
        'xTile.Pipeline.TideReader': '.tbin',
    }[blob.type] ?? '.json'
    return cut_path.replace(/\.xnb$/, newExtension)
}

class Pack {
    files = [];
    xnbs = [];
    manifest_info = {};
    manifest = {};
    content = {};
    
    constructor(manifest_info, xnbs) {
        this.manifest_info = manifest_info;
        this.xnbs = xnbs;

        this.manifest = {
            "Name": manifest_info.manifest_name,
            "Author": manifest_info.manifest_author,
            "Version": manifest_info.manifest_version,
            "Description": `${manifest_info.manifest_name} converted to Content Patcher by XNB2CP (https://xnb.pillow.rocks)`,
            "UniqueID": clean_uid(manifest_info.manifest_author + '.' + manifest_info.manifest_name),
            "UpdateKeys": [ ],
            "ContentPackFor": {
                "UniqueID": "Pathoschild.ContentPatcher"
            }
        }
    }

    async convert() {
        this.files = await Promise.all(this.xnbs.map(async xnb => {
            const uncut_path = xnb.webkitRelativePath;
            //remove the unneeded folder from the path
            const path_split = uncut_path.split('/');
            //check if it doesn't start with any of valid_content_folders
            if (!valid_content_folders.includes(path_split[0])) {
                //remove the first element
                path_split.shift();
            }
            //rejoin the path
            const cut_path = path_split.join('/');
            const blob = await XNB.unpackToContent(xnb)

            return {
                file: blob,
                // source: xnb.webkitRelativePath.replace(/\.xnb$/, '.png'),
                target: cut_path,
                asset: `assets/${getNonXnbExtension(cut_path, blob)}`
            };
        }));

        this.content = {
            "Format": "1.28.0",
            "Changes": await Promise.all(this.files.map(async file => {
                return await generateChange(file)
            }))
        }

        this.zip = new JSZip();
        this.zip.file('manifest.json', JSON.stringify(this.manifest, null, 4));
        this.zip.file('content.json', JSON.stringify(this.content, null, 4));

        await Promise.all(this.files.map(async file => {
            const b64 = (await blobToBase64(file.file)).split(',')[1];
            
            this.zip.file(file.asset, b64, { base64: true });
        }));

        this.zip.generateAsync({ type: "blob" }).then(content => {
            // see FileSaver.js
            // saveAs(content, "contentpack.zip");
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.manifest_info.manifest_name + '.zip';
            a.classList.add('download-a');
            // a.innerText = 'Download Now';
            
            const img = document.createElement('img');
            img.src = 'assets/download-btn.png';
            img.alt = 'Download Now';
            img.classList.add('download-btn');
            img.width = 176;
            img.height = 52;

            const h3 = document.createElement('h3');
            h3.innerText = `Successfully converted ${this.manifest_info.manifest_name}!`;
            h3.classList.add('download-h');

            
            a.appendChild(h3);
            a.appendChild(img);

            file_download_area.appendChild(a);
        })

    
    }
    
}

const xnb_files = [];

function convert() {
    if (xnb_files.length == 0) return;

    const form = Object.fromEntries(new FormData(manifest_form));

    const pack = new Pack(form, xnb_files);
    pack.convert().then(() => {
        console.log(pack);
    });
}

function populateFilesTable(files) {
    file_table.style.display = 'table';

    for (const file of files) {
        console.log(file);
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const size = document.createElement('td');
        const path = document.createElement('td');

        name.innerText = file.name;
        size.innerText = file.size;
        path.innerText = file.webkitRelativePath;

        row.appendChild(name);
        row.appendChild(size);
        row.appendChild(path);
        file_table_tbody.appendChild(row);
    }
}

modfileinput.addEventListener('change', function () {
    // `this` is in refence to modfileinput, for clarification
    hideDisablerOverlay();

    Array.from(this.files).forEach(file => {
        if (!valid_file_types.includes(file.name.split('.').pop())) return;

        xnb_files.push(file);
    })

    populateFilesTable(xnb_files);
});

contentfileinput.addEventListener('change', function () {
    hideDisablerOverlay();

    // `this` is in refence to modfileinput, for clarification
    Array.from(this.files).forEach(file => {
        CONTENT_FOLDER.set(cleanXnbPath(file.webkitRelativePath.split('/').slice(1).join('/')), file)
    })
})

function showDisablerOverlay(overlayer = fileupload_btn, translationKey = 'choose-content-folder-xnb.h1') {
    filedisabler_overlay.classList.remove('hidden');

    //get x/y of .file-btn
    var rect = overlayer.getBoundingClientRect();
    
    filedisabler_overlay.style = `--top: ${rect.top}px; --left: ${rect.left}px;`;
    filedisabler_overlay.querySelector('#big-file-disabler-text').innerText = window.xtranslations[translationKey]
}

function hideDisablerOverlay() {
    filedisabler_overlay.classList.add('hidden');
}

[ filecancel_btn, filecancel_btn_overlay ].forEach(btn => btn.addEventListener('click', function () {
    modfileinput.value = "";
    hideDisablerOverlay();
}));

modfileinput.addEventListener('click', () => 
    showDisablerOverlay(fileupload_btn, 'choose-content-folder-xnb.h1'));
contentfileinput.addEventListener('click', () => 
    showDisablerOverlay(contentfileupload_btn, 'choose-content-folder-content.h1'));

[ github_link, language_btn ].forEach(e => e.addEventListener('mouseleave', function () {
    this.classList.add('leave');
    setTimeout(() => {
        this.classList.remove('leave');
    }, 500);
}));

language_button.addEventListener('click', () => {
    language_popup.classList.toggle('hidden')
})

document.body.addEventListener('click', e => {
    if (e.target.id !== language_popup.id
        && !language_button.contains(e.target)
        && !language_popup.contains(e.target)
        && !language_popup.classList.contains('hidden')
    ) language_popup.classList.add('hidden')
})

for (const key of Object.keys(supported_languages)) {
    const lang = supported_languages[key]
    const li = document.createElement('li')

    li.id = `language-${key}`
    li.classList.add('language-list-element')

    li.innerHTML = `<h1>${lang['flag']}</h1>`

    li.addEventListener('click', () => {
        localStorage.setItem('chosen-language', key)
        loadTranslations(key)
    })

    language_list.appendChild(li)
}