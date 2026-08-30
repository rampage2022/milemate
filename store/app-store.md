# App Store Connect listing — MileMate Workdays

Paste these fields into App Store Connect. This is listing copy only. The home-screen name under the icon stays **MileMate** (`CFBundleDisplayName` / `expo.name`).

Do not use the store name **MileMate Mileage Tracker**. Two unrelated Finance apps already ship under that name (Emelian LLC, Apple ID `6744936631`; OverSphere LLC, Apple ID `1408695012`).

## Identity (binary / EAS)

| Field | Value |
| --- | --- |
| iOS bundle identifier | `com.rayarmstrong.milemate` |
| Android application ID | `com.rayarmstrong.milemate` |
| Home-screen display name | MileMate |
| URL scheme | `milemate` |
| Expo slug | `MileMate` |
| Export compliance | `ITSAppUsesNonExemptEncryption` = `false` |

No Apple Team ID is stored in this repo. Use the personal Apple Developer account in App Store Connect / EAS when prompted.

## Name and subtitle

| Field | Value | Limit |
| --- | --- | --- |
| Name | MileMate Workdays | 30 characters (17 used) |
| Subtitle | Work mileage, no logbook | 30 characters (24 used) |

## Promotional text (170 characters)

```
Capture the workday, not every trip. Start and end a workday to record mileage while you drive. No logbook. No tax dashboard.
```

## Description

```
MileMate captures the workday so you have a mileage record when you need one.

This is not a trip logbook and not a tax dashboard. You do not classify every drive, manage a ledger, or maintain a finance app. Start a workday, keep MileMate open while you drive, end the workday, and keep a record of how far you drove.

Use MileMate when you visit stores, clients, or job sites and need work mileage without keeping a trip-by-trip logbook.

What it is
• Workday capture for people who drive as part of the job
• Manual start and end of a workday from the home screen
• Foreground location while a workday is active, used to record distance
• A record you can review when it is time to bill or file

What it is not
• Background GPS or tracking after you leave the app
• Automatic workday start or stop
• A trip-by-trip mileage logbook
• A tax-category or deduction dashboard
• A clone of existing “mileage tracker” finance apps
```

## Keywords (100 characters)

Do not use the phrase “MileMate Mileage Tracker” or a keyword string that reconstructs it (for example `milemate,mileage,tracker`).

```
workday,mileage,work,driving,field,contractor,reimbursement,self-employed,route,visits
```

(86 characters including commas)

## Review notes (optional)

MileMate is a workday mileage recorder. v1 uses manual start and stop: the user starts a workday, location is used in the foreground while the workday is active and the app is open, then the user ends the workday. This version does not track location in the background and does not start or stop workdays automatically. The App Store listing name is “MileMate Workdays”; the name under the icon is “MileMate”. This app is not affiliated with the existing App Store titles named “MileMate Mileage Tracker”.
