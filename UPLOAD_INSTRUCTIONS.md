# 📦 הוראות העלאה ל-GitHub

## מה צריך להעלות לריפו https://github.com/menifainance-stack/Menifa

3 קבצים/תיקיות מהתיקייה הזו:

```
github-upload/
├── index.html                                 ← קובץ האתר הראשי
├── README.md                                  ← תיאור הריפו
└── .github/
    └── workflows/
        └── notify-on-update.yml               ← אוטומציית התראות
```

## דרך 1: גרירה דרך הדפדפן (הכי קל)

1. כנס ל: https://github.com/menifainance-stack/Menifa
2. לחץ **"uploading an existing file"** (קישור כחול בדף הריפו הריק)
3. **בחלון Finder/Explorer**:
   - פתח את התיקייה `github-upload`
   - **סמן את כל 3 הקבצים** (index.html, README.md, וגם את התיקייה .github)
   - גרור הכל לחלון הדפדפן

4. למטה כתוב הודעת קומיט: `העלאה ראשונית: אתר + workflow`
5. לחץ **"Commit changes"**

## דרך 2: דרך הטרמינל (אם יש לך git מותקן)

```bash
cd "C:/Users/menif/OneDrive/Desktop/משכנתאות/עסק/עובד AI/פרויקטים/github-upload"
git init
git remote add origin https://github.com/menifainance-stack/Menifa.git
git add .
git commit -m "Initial upload"
git branch -M main
git push -u origin main
```

## אחרי ההעלאה

✅ **חזור הנה ותגיד "הועלה"** כדי שאמשיך עם:
- חיבור Netlify
- הוספת Secrets
- יצירת ה-Routine האוטומטית
