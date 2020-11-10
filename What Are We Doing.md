# Trello board
Follow progress over [here!](https://trello.com/b/S2gdVTdb/simple-cms)

# DB
[See how the DB will be structured~!](https://dbdiagram.io/d/5f5fc8e17da1ea736e2dd3ff)

# What we did
## 14th of September 2020
We opened up the repo and made a basic diagram of how the DB will work.

## 15th of September 2020
We added in a config template and installed express.

## 16th of September 2020
We added in the tables we'll need into our code.

We created a basic authentication class and started adding in register and DB functions.

### Explanation on Slugs:
Slugs make names that work better for URLs.
Example: Sana Rinomi => sana_rinomi

## 21st of September 2020
Fleshed out the local auth class (no testing as of right now)

## 23rd of September 2020
Test and debug the auth and local auth classes.
They are now fully functional, allowing for: Registering, Login, Logout, Serialization and Deserialization.

## 28th of September 2020
Started implementing file uploads and created a new table for additional upload data.
Also created a bunch of new views for later

## 29th of September to 1st of October 2020
* Implemented file upload
* Created user profile
* Created user settings

## 5th of October 2020
We finished filling out the user settings, added the ability to create a post and list them out.

## 7th of October 2020
Added image upload, section organization and section duplication. Also linked posts to uploads.

## 12th of October 2020
Moved "Create new post" into admin's post list and added the ability to delete posts.

Created a list of uploads that indicate which uploads are linked with posts and added the ability to remove uploads.

Added the ability to view post details when a post is selected in post editor.

Cleaned up admin index and added links to the the lists AKA managers.

## 13th of October 2020
Post titles, descriptions and thumbnails can now be edited in the post editor, as well as deleting the post from within there.

Categories are now listed and can be created. Category descriptions and names can be changed from the category editor.

Table class can now update the "Last modified" column when the column is specified and an upsert has occured.

## 14th of October 2020
Deviated from the intented goal of this stream and ended up redoing the database as well as doing some clean up here and there while adding some more functionality to our DBTable class;

## 19th of October 2020
At the start of the stream, we set up the Trello board of the project and linked it here as well as in README.md

We can link posts to categories and remove links when required. Added categories and authors to post details. And categories list posts linked to them.

## 20th of October 2020
Started a large-ish code clean up. Mainly moving code that would be repeated to functions.

## 9th of November 2020
After the clean up, we finally hava a working frontpage and categories. You can view posts easily as the user and such. With some styling and filling out left only.

## 10th of November 2020
And that's a wrap! The CMS works and has some simple styling when it comes to user interaction and what's left is form styling, Admin panel styling and basically some polish!

You guys can try it and mess around with it as much as your heart desired and I hope you enjoyed seeing how a simple CMS can be made in the span of a month!