# Booklet config
There are some configuration parameters for adjusting the behaviour during the test.This 
document describes the ways to bring the parameters to the application and lists
all possible keys.
 
### Configuration file on the server
There is one file on the server where the application looks for booklet definitions:
```
/config/bookletDefintions.json
``` 
This configuration is loaded at (re)start of the application and is applied for 
all booklets, if no other configuration is found. This is a simple JSON file with 
key value pairs. Example:
```
{
    "force_responses_complete": "OFF",
    "unit_navibuttons": "ARROWS_ONLY",
...
}
```
The adminstrator of the server can upload this file. We aim at providing an 
administration feature of the super-admin section of the application to manage 
this configuration.

### List of parameters
