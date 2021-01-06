FROM mariadb:10.1.48-bionic

#RUN apt-get update && apt-get install -y wget gnupg2 lsb-release && \
#	wget https://repo.percona.com/apt/percona-release_latest.generic_all.deb && \
#	dpkg -i percona-release_latest.generic_all.deb && \
#	apt-get install --fix-broken && apt-get update && apt-get install -y pmm-client

LABEL maintainer="Akkadius <akkadius1@gmail.com>"
COPY my.cnf /etc/mysql/conf.d/my.cnf
CMD ["mysqld"]

EXPOSE 3306
