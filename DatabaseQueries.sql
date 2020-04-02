use blogger;

create table User(
    user_id int auto_increment, 
    username varchar(100), 
    pass varchar(100),
    primary key(user_id)
);

create table Blog(
b_id int auto_increment,
title text,
postBody text,
photo varchar(150),
dateandTime timestamp,
author varchar(100),
aboutAuthor text,
primary key(b_id),
user_id int,
foreign key(user_id) references User(user_id)
);


-- Queries

select * from Blog where b_id=1;

select * from Blog order by dateandTime desc;
select * from User;
INSERT INTO `blogger`.`Blog` (`b_id`, `title`, `postBody`, `photo`, `dateandTime`, `author`, `aboutAuthor`, `user_id`) VALUES ('1', 'nodejs', 'Perfect Framework its just the bestest bestsessfsdfsknjnsdkjbnfsbn askdbjnakjsfbn safbknafskjbnab', 'img.jpg', '2020-01-19 03:14:07', 'Shubham Pathak', 'Best developer', '1');