/// <reference path="imports.js" />
/// <reference path="translations.js" />

const fileinput = document.querySelector('#file-input');
const filedisabler_overlay = document.querySelector('.file-disabler');
const fileupload_btn = document.querySelector('.file-btn');
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

const valid_content_folders = ['Animals', 'Characters', 'Effects', 'LooseSprites', 'Minigames', 'Strings', 'TileSheets', 'Buildings', 'Data', 'Fonts', 'Maps', 'Portraits', 'TerrainFeatures', 'VolcanoLayouts']
const valid_file_types = [
    'xnb',
    'json',
    'png',
    'tbin',
    'tmx',
    'tsx',
    'xwb',
]

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
            "Description": `${manifest_info.manifest_name} converted to Content Patcher by XNB2CP-Web`,
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

            return {
                file: await XNB.unpackToContent(xnb),
                // source: xnb.webkitRelativePath.replace(/\.xnb$/, '.png'),
                target: cut_path,
                asset: `assets/${cut_path.replace(/\.xnb$/, '.png')}`
            };
        }));

        this.content = {
            "Format": "1.28.0",
            "Changes": await Promise.all(this.files.map(async file => {
                return {
                    "Action": "Load",
                    "Target": file.target,
                    "FromFile": file.asset
                }
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

console.log(fileinput)
fileinput.addEventListener('change', function () {
    hideDisablerOverlay();

    Array.from(this.files).forEach(file => {
        if (!valid_file_types.includes(file.name.split('.').pop())) return;

        xnb_files.push(file);
    })

    populateFilesTable(xnb_files);

});

function showDisablerOverlay() {
    filedisabler_overlay.classList.remove('hidden');

    //get x/y of .file-btn
    var rect = fileupload_btn.getBoundingClientRect();
    
    filedisabler_overlay.style = `--top: ${rect.top}px; --left: ${rect.left}px;`;
}

function hideDisablerOverlay() {
    filedisabler_overlay.classList.add('hidden');
}

[ filecancel_btn, filecancel_btn_overlay ].forEach(btn => btn.addEventListener('click', function () {
    fileinput.value = "";
    hideDisablerOverlay();
}));

fileinput.addEventListener('click', showDisablerOverlay);

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

function clean_uid(input) {
    return input.replace(/\s/g, '_').replace(/[^\w]/g, '.');
}

function blobToBase64(blob) {
    console.log(blob)
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        if (blob.content) reader.readAsDataURL(blob.content);
        else reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
    });
}