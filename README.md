# SE3355-Final-IMDB

https://drive.google.com/drive/folders/1844d9sC78e6sATDHRaTcvkn924rNrX_e?usp=drive_link

I've attached the link to my web design video. I thought it would be more appropriate to share the video since when deployed via Azure, it gives an Site Under Construction.

I used a MySQL database to store my data, which includes tables for movies and users, among others. The movies table contains attributes such as title, image_url, trailer_url, rating, actors, director, category, actor_photo, and popularity_score. The users table includes attributes like name, surname, email, password, country, and city. Additionally, I have tables for comments, ratings, and watchlists to manage user interactions.

To avoid hardcoding images, I stored them in the records of the respective tables. This way, I can easily access both my database and associated images, such as product images and campaign images, using Express.

I created an IMDb-style project using MySQL for data storage and Express for the backend, complemented by HTML, CSS, and Bootstrap for the frontend. The application features comprehensive user authentication, including Google Sign-In, as well as traditional email-based login and sign-up. Once logged in, users can see their name displayed on the navbar in place of the sign-in option.

Logged-in users have access to additional features such as a watchlist to save their favorite movies, and the ability to leave ratings and comments on movies. They can also view previous comments and the average rating for each movie. Trailers are available for all movies, enhancing the user experience.

Non-logged-in users have limited access and cannot use the watchlist, rate movies, or leave comments. The homepage showcases the top 10 movies, providing an engaging entry point for all users. The search bar includes filtering options for movies and celebrities, with suggestions displayed as users type.

Overall, this project integrates various technologies to offer a seamless and interactive platform for movie enthusiasts.
