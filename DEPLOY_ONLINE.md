# ការណែនាំអំពីការដាក់ឱ្យប្រើប្រាស់លើបណ្តាញអនឡាញ
### Deployment Guide for Online Timetable Management System

ប្រព័ន្ធនេះត្រូវបានរៀបចំឡើងជាពិសេសដើម្បីអាចដាក់ឱ្យប្រើប្រាស់លើបណ្តាញអនឡាញ (Online) បានយ៉ាងងាយស្រួល ដោយឥតគិតថ្លៃ (100% Free) តាមរយៈជម្រើសងាយស្រួលៗជាច្រើន ៖

---

## 🚀 ជម្រើសទី១ ៖ ដាក់លើ Netlify (ងាយស្រួលបំផុត ត្រឹមតែ ១០ វិនាទី គ្មានកូដ)

វិធីនេះគឺលឿន និងងាយស្រួលបំផុត មិនចាំបាច់មានចំណេះដឹងខាងកូដទេ ៖

1. បើកកម្មវិធីរុករក (Browser) ចូលទៅកាន់ ៖ **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. ចុះឈ្មោះ ឬចូលគណនី (Sign in) ដោយឥតគិតថ្លៃ
3. បើកកុំព្យូទ័រទៅកាន់ Folder `F:\Timeline\`
4. ចាប់អូស (Drag & Drop) ថត **`online_web`** ទម្លាក់ចូលទៅក្នុងប្រអប់រង្វង់លើគេហទំព័រ Netlify
5. **រួចរាល់!** Netlify នឹងផ្តល់ជូននូវអាសយដ្ឋាន Link អនឡាញភ្លាមៗ (ឧទាហរណ៍ ៖ `https://school-timetable-2026.netlify.app`) ដែលលោកគ្រូ-អ្នកគ្រូអាចបើកមើលកាលវិភាគពីទូរស័ព្ទដៃ iPad ឬកុំព្យូទ័រគ្រប់ទីកន្លែង!

---

## ⚡ ជម្រើសទី២ ៖ ដាក់លើ Vercel (ល្បឿនលឿន និងពេញនិយមបំផុត)

1. បង្កើតគណនីឥតគិតថ្លៃនៅ ៖ **[https://vercel.com](https://vercel.com)**
2. ភ្ជាប់ជាមួយគណនី GitHub របស់អ្នក
3. បង្កើត Repository ថ្មីលើ GitHub រួច Upload កូដក្នុង `F:\Timeline\` ទាំងអស់
4. នៅលើ Vercel ចុច **"Add New Project"** រួច Import Repository នោះ
5. ចុច **"Deploy"** (ប្រព័ន្ធមានឯកសារ `vercel.json` រួចជាស្រេច)
6. ត្រឹមតែ ១ នាទី លោកអ្នកនឹងទទួលបាន Link ផ្លូវការ (ឧ. `https://timetable.vercel.app`)

---

## ☁️ ជម្រើសទី៣ ៖ ដាក់លើ Render.com (ពេញលេញជាមួយ Python Flask Backend)

1. ចុះឈ្មោះឥតគិតថ្លៃនៅ ៖ **[https://render.com](https://render.com)**
2. ចុច **"New +"** -> ជ្រើសរើស **"Web Service"**
3. ភ្ជាប់ GitHub Repository ដែលមានកូដក្នុង `F:\Timeline`
4. Render នឹងស្គាល់ឯកសារ `render.yaml` និង `Procfile` ដោយស្វ័យប្រវត្តិ ៖
   * **Runtime** ៖ Python 3
   * **Build Command** ៖ `pip install -r requirements.txt`
   * **Start Command** ៖ `gunicorn app:app`
5. ចុច **"Create Web Service"** រួចរង់ចាំ ២-៣ នាទី ជាការស្រេច។

---

## 🐙 ជម្រើសទី៤ ៖ ដាក់លើ GitHub Pages (ឥតគិតថ្លៃរហូត)

1. បង្កើត Repository ថ្មីលើ GitHub (ឧទាហរណ៍ ៖ `timetable-khmer`)
2. Upload ឯកសារទាំងអស់ក្នុងថត `online_web/` ទៅកាន់ Repository នោះ
3. ចូលទៅកាន់ **Settings** របស់ Repo -> ជ្រើសរើស **Pages**
4. នៅត្រង់ **Branch** ជ្រើសរើស `main` រួចចុច **Save**
5. វេបសាយនឹងដំណើរការនៅអាសយដ្ឋាន ៖ `https://<username>.github.io/timetable-khmer/`

---

## 💾 សុវត្ថិភាព និងការបម្រុងទុកទិន្នន័យ (Data Backup & Restore)

* នៅក្នុងកំណែអនឡាញ រាល់ការកែប្រែឈ្មោះគ្រូបន្ទុកថ្នាក់ ឬគ្រូមុខវិជ្ជា ត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិតាមរយៈ **LocalStorage** នៃ Browser។
* លើសពីនេះ ក្នុងផ្ទាំង **«🖨️ បោះពុម្ព & Excel»** មានប៊ូតុង ៖
  * **«📤 ទាញយក Backup File (.json)»** ៖ ដើម្បីរក្សាទុកឯកសារទិន្នន័យលើកុំព្យូទ័រ
  * **«📥 ផ្ទុកឡើង Restore (.json)»** ៖ ដើម្បីផ្ទេរទិន្នន័យទៅកាន់ទូរស័ព្ទ ឬកុំព្យូទ័រផ្សេងទៀតដោយមិនបាត់បង់ទិន្នន័យឡើយ!

