--addHelpers.sql - Gradebook

--Edited by Bruno DaSilva, Andrew Figueroa, and Jonathan Middleton (Team Alpha)
-- in support of CS305 coursework at Western Connecticut State University.

--Licensed to others under CC 4.0 BY-SA-NC

--This work is a derivative of Gradebook, originally developed by:

--Zaid Bhujwala, Zach Boylan, Steven Rollo, Sean Murthy
--Data Science & Systems Lab (DASSL), Western Connecticut State University (WCSU)

--(C) 2017- DASSL. ALL RIGHTS RESERVED.
--Licensed to others under CC 4.0 BY-SA-NC
--https://creativecommons.org/licenses/by-nc-sa/4.0/

--PROVIDED AS IS. NO WARRANTIES EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

--This script adds functions that are used throughout Gradebook or Gradebook's
-- installation scripts. This should be the first script file run after
-- preparing a server and initializing a DB

START TRANSACTION;

--Suppress messages below WARNING level for the duration of this script
SET LOCAL client_min_messages TO WARNING;

--Set schema to reference in functions and tables, pg_temp is specified
-- last for security purposes
SET LOCAL search_path TO 'alpha', 'pg_temp';


--Given a VARCHAR of any length, returns true if it is a valid SQL identifier
-- using a restricted subset of PostgreSQL's rules for SQL identifiers.
-- The following are checked:
-- - Must be less than 64 characters
-- - Must begin with a letter from a-z/A-Z or an _ (this is more restrictive
--   than Postgres' rules)
-- - Must only contain letters a-z/A-Z, digits 0-9, _, and $
CREATE OR REPLACE FUNCTION isValidSQLID(ID VARCHAR) RETURNS BOOLEAN AS
$$
BEGIN
   IF LENGTH(ID) > 63 THEN RETURN FALSE;
   END IF;

   IF LEFT(ID, 1) !~ '[a-zA-Z_]' THEN RETURN FALSE;
   END IF;

   IF ID ~ '[^a-zA-Z0-9_$]' THEN RETURN FALSE;
   END IF;

   RETURN TRUE;
END;
$$
   LANGUAGE plpgsql;


COMMIT;
