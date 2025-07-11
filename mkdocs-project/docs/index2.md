# Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps

Table of Contents

## Introduction
```python
def example():
    pass
```
Monitoring Proxmox with Grafana will be a good idea to see the actual resource utilization on our Proxmox cluster. Already we have covered in our previous guide about “[How to monitor Linux servers using Prometheus and Grafana](https://www.linuxsysadmins.com/prometheus-with-grafana-for-linux-server/)“. However, in this guide let’s focus on how to monitor the Proxmox virtualization platform with the help of Proxmox and influxDb.

Proxmox supports Graphite and InfluxDB while comparing the advantage of using InfluxDB and graphite, InfluxDB owns the match. Let’s start to setup influx DB by following below guide.

-   [How to Install InfluxDB on Linux](https://www.linuxsysadmins.com/install-influxdb-on-linux-3-easy-steps/)

Right after installing the InfluxDB, start to create the DB user, Database with required privileges.

### Creating a Monitoring Database

Creating database for monitoring Proxmox, Replace the user and password value as per standard to your setup.

``` sql
CREATE USER admin WITH PASSWORD 'Redhat@123' WITH ALL PRIVILEGES
CREATE DATABASE mondb
CREATE USER monuser WITH PASSWORD 'Redhat@123'
GRANT ALL ON mondb TO monuser
exit
```

Create, Verify and list the created database

```sql
sysadmin@monitor:~$ influx
Connected to http://localhost:8086 version 1.8.3
InfluxDB shell version: 1.8.3
> CREATE USER admin WITH PASSWORD 'Redhat@123' WITH ALL PRIVILEGES
> CREATE DATABASE mondb
> CREATE USER monuser WITH PASSWORD 'Redhat@123'
> GRANT ALL ON mondb TO monuser
> SHOW GRANTS FOR monuser
database privilege
-------- ---------
mondb    ALL PRIVILEGES
> SHOW DATABASES
name: databases
name
----
_internal
mondb
> 
> exit
sysadmin@monitor:~$
```

### InfluxDB configuration for Proxmox

Few configurations are required for Proxmox. Edit the main configuration for Influxdb to add the require options

```bash
sudo vim /etc/influxdb/influxdb.conf
```

This port should match to Proxmox metric configuration.

DataCenter –> Metric Server –> Add –> InfluxDB

```
[[udp]]
   enabled = true
   bind-address = ":8089"
   database = "mondb"
   batch-size = 5000
   batch-timeout = "1s"
```

Make sure to use the database we created in earlier steps.

### Install Grafana for Monitoring Proxmox

First, let’s start to resolve the required dependencies for Grafana installation.

```shell
sudo apt-get install -y apt-transport-https
sudo apt-get install -y software-properties-common wget
```

Import the apt key for grafana

```
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
```

Enable the repository, If you are running from unprivileged account it will prompt to enter the password for privilege escalation.

```
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
```

Installing Grafana, update the apt cache and by following install the Grafana.

```bash
sudo apt-get update
sudo apt-get install grafana
```

```bash
Unpacking grafana (7.3.6) ...
Setting up fonts-dejavu-core (2.37-1) ...
Setting up fontconfig-config (2.13.1-2ubuntu3) ...
Setting up libfontconfig1:amd64 (2.13.1-2ubuntu3) ...
Setting up grafana (7.3.6) ...
Adding system user `grafana' (UID 112) ...
Adding new user `grafana' (UID 112) with group `grafana' ...
Not creating home directory `/usr/share/grafana'.


### NOT starting on installation, please execute the following statements to configure grafana to start automatically using systemd
 sudo /bin/systemctl daemon-reload
 sudo /bin/systemctl enable grafana-server


### You can start grafana-server by executing
 sudo /bin/systemctl start grafana-server
Processing triggers for systemd (245.4-4ubuntu3) ...
Processing triggers for man-db (2.9.1-1) ...
Processing triggers for libc-bin (2.31-0ubuntu9) ...
```

### Configuring Grafana

Post to Grafana installation, we need to make few changes.

```bash
sudo vim /etc/grafana/grafana.ini
```

Few of interesting configurations for monitoring Proxmox are as follows. If you need to setup a default admin account and password we need to set here before starting the Grafana service.

```bash
[paths]
logs = /var/log/grafana
plugins = /var/lib/grafana/plugins

[server]
protocol = http
http_port = 3000

[security]
admin_user = admin
admin_password = admin
```

Make the Systemd configuration changes by running “*daemon-reload*” by following enable and start the service persistently.

```bash
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

### Installing Plugins and Dashboard

Few of cool [dashboards](https://grafana.com/grafana/dashboards) are listed below. We will use anyone of below dashboard soon in upcoming steps.

```bash
https://grafana.com/grafana/dashboards/10048
https://grafana.com/grafana/dashboards/13307
https://grafana.com/grafana/dashboards/11418
https://grafana.com/grafana/dashboards/11416
```

If any plugins are missing we could get the alerts in the dashboard. Install the missing plugins by running below command, replace the plugin name with your missing plugin name.

```
$ sudo grafana-cli plugins install grafana-clock-panel
$ sudo grafana-cli plugins install blackmirror1-singlestat-math-panel
```

Search for the plugins at `https://grafana.com/grafana/plugins`

```
sysadmin@monitor:~$ sudo grafana-cli plugins install grafana-clock-panel
installing grafana-clock-panel @ 1.1.1
from: https://grafana.com/api/plugins/grafana-clock-panel/versions/1.1.1/download
into: /var/lib/grafana/plugins

 Installed grafana-clock-panel successfully 

Restart grafana after installing plugins . <service grafana-server restart>

sysadmin@monitor:~$ 

sysadmin@monitor:~$ sudo grafana-cli plugins install blackmirror1-singlestat-math-panel
installing blackmirror1-singlestat-math-panel @ 1.1.7
from: https://grafana.com/api/plugins/blackmirror1-singlestat-math-panel/versions/1.1.7/download
into: /var/lib/grafana/plugins

 Installed blackmirror1-singlestat-math-panel successfully 

Restart grafana after installing plugins . <service grafana-server restart>

sysadmin@monitor:~$
```

Now if you check the database, we could see some tables and columns.

```
sysadmin@monitor:~$ influx -database 'mondb' -username 'mondb' -password 'Redhat@123'
Connected to http://localhost:8086 version 1.8.3
InfluxDB shell version: 1.8.3
> show databases
name: databases
name
----
_internal
mondb
linuxsys_db
> 
> use mondb
Using database mondb
> 
> show MEASUREMENTS
name: measurements
name
----
ballooninfo
blockstat
cpustat
memory
nics
proxmox-support
system
> 
```

### Accessing Grafana

Right after starting the Grafana service, access the URL from anyone of your favorite web browser. The default port of Grafana is 3000.

```
https://monitor.linuxsysadmins.local:3000
```

The default username and password are `admin` and `admin`

If you are accessing dashboard for the first time, it will prompt to change the password.

![Login to grafana](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Login-to-grafana-954x1024.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 1")

Login to grafana

### Adding Data Source for Monitoring Proxmox

As we have installed and configured to use the InfluxDB for Proxmox, now we need to add the data source with InfluxDB database information.

Navigate to Settings ![gear](https://www.linuxsysadmins.com/wp-content/uploads/2020/11/gear.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 2") gear icon **–>** and select the Data Sources.

![Adding datasource in grafana](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Adding-datasource-in-grafana-1024x647.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 3")

Adding datasource in grafana

Click the *Add data source*

![Click to add source](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Click-to-add-source-1024x400.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 4")

Click to add source

Select InfluxDB by clicking on it.

![Select influxdb as sources](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Select-influxdb-as-sources-1024x705.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 5")

Select influxdb as sources

Feed the HTTP URL where the InfluxDB installed, In our case its on same server where we installed Grafana.

![adding influxdb server info](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/adding-influxdb-server-info-1024x864.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 6")

adding influxdb server info

Provide the InfluxDB information and select either GET or POST for HTTP method.

Click the *Save & Test* to make the connection test and save the configuration.

![Influxdb database info](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Influxdb-database-info-1024x727.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 7")

Influxdb database info

Data Source has been successfully added to start monitoring Proxmox. Now we could see the added Data source in the list.

![Added data source](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Added-data-source-1024x359.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 8")

Added data source

### Importing Predefined Dashboards

There are only very few pre-defined dashboards are available for Proxmox. In our earlier step, We have shared few of dashboards URL. Get the dashboard ID from there

Click the **+** Symbol from left side pane and select the *Import*

![Importing preconfgured dashboard](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Importing-preconfgured-dashboard-1024x673.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 9")

Importing preconfigured dashboard

Each predefined dashboard have a ID, copy paste the ID and click load.

Here we are using ID 12966 for demonstration purpose.

![Import preconfigured dashboards](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Import-preconfigured-dashboards-1024x988.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 10")

Import preconfigured dashboards

Select all the sources as InfluxDB

![select the data sources](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/select-the-data-sources-731x1024.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 11")

select the data sources

### Proxmox WebUI Configuration

Switch back to Proxmox webUI and configure the InfluxDB from metrics.

-   Navigate to **Server View** from the drop-down list.

-   Select the Datacenter from the list.
-   Click on Metric from right side pane above the support option.

-   Click Add and select the InfluxDB

![Adding metric configuration to Proxmox](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Adding-metric-configuration-to-proxmox.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 12")

Adding metric configuration to Proxmox

Now we could get the below window.

-   Enter a Name

-   IP address or hostname of the monitoring server, In my case 192.168.0.50 resolving to monitor.linuxsysadmins.local
-   Select the *Enabled* option.

-   Enter the Port number where the data should be sent.
-   Click *create* to create the entry.

![Influxdb server info in proxmox](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Influxdb-server-info-in-proxmox.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 13")

Influxdb server info in proxmox

To make sure the changes from Proxmox command line.

```
root@pve1:~# cat /etc/pve/status.cfg
influxdb: monitor
	port 8089
	server 192.168.0.50

root@pve1:~#
```

### Viewing Grafana Dashboards

Back to Grafana GUI and check the Dashboards, now you could get some graphs.

![Dashboard with metric](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Dashboard-with-metric-1024x526.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 14")

Dashboard with metric

More information.

![Metric info](https://www.linuxsysadmins.com/wp-content/uploads/2021/01/Metric-info-1024x564.png "Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps 15")

Metric info

That’s it, we have successfully started to get visualize the Proxmox environment.

## Conclusion

To get the metric information of Proxmox Virtualization platform we can use the Grafana with InfluxDB. By installing the InfluxDB and start using Grafana in a few minutes to get a good visualization on your resource utilization in your Proxmox environment. Subscribe to our newsletter and stay close for more updates, your feedbacks are welcome through below comment section.

---
Source: [Monitoring Proxmox with InfluxDB and Grafana in 4 Easy steps](https://www.linuxsysadmins.com/monitoring-proxmox-with-grafana/)