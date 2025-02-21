import arcpy
import os
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')
    # Path to the file geodatabase where intermediate temporary datasets are stored
    work_gdb = r'work.gdb'
    tmp_dataset_path = os.path.join(work_gdb, "tmp_"  + str(time))

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    dataset_to_validate = arcpy.GetParameterAsText(0)
    text = arcpy.GetParameterAsText(1)
    output_dataset_path = arcpy.GetParameterAsText(2)
    generalOutputInfo = {'error': False, 'infoMessages': []}
    datasetOutputInfo = {'inputDataset': None, 'geometry': None, "intermediateDataset": None, "outputDataset": None, "datasetError": False, "featureCount": 0, "datasetErrorCount": 0, "infoMessages": []}
    rules = None
    userId = None
    # defined validation rules for fields
    defined_rules = ["mandatory", "type", "range", "length", "domain"]
    # defined fields data types
    defined_types = ["integer", "float", "text", "date"]
    # mandatory fields for the dataset
    mandatory_fields = []
    # fields mapping. Tupples: (harmonize name, dataset name)
    mapped_fields = []
    # fields that will be validated
    fields_to_process = []
    # harmonized output fields
    output_fields = []
    # input values
    valid_input_values = []
    
    try:
        rules = json.loads(text)
    except Exception as e:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed read or load JSON validation rules. ERROR: ' + str(e)})
    
    # Check JSON validation rules structure
    if not generalOutputInfo['error']:
        if 'userId' in rules:
            userId = rules['userId']
            if 'name' in rules:
                datasetOutputInfo['inputDataset'] = rules['name']
                if 'geometry' in rules:
                    datasetOutputInfo['geometry'] = rules['geometry']
                    if 'fields' in rules:
                        for (field_name, field_rules) in rules['fields'].items():
                            if 'mandatory' in field_rules:
                                # Store mandatory field names for the validation
                                if field_rules['mandatory'] == 'yes':
                                    mandatory_fields.append(field_name)
                                    if 'mapped_attribute_name' in field_rules:
                                        pass
                                    else:
                                        generalOutputInfo["error"] = True
                                        generalOutputInfo['infoMessages'].append({'error': 'No attribute name mapped for the mandatory field "' + field_name + '".'})
                                        break
                                # Store validation field names in tuples (harmonized name, dataset name)
                                if 'mapped_attribute_name' in field_rules:
                                    mapped_fields.append((field_name, field_rules['mapped_attribute_name']))
                                if 'type' in field_rules:
                                    # The field type must be one of the defined
                                    if field_rules['type'] in defined_types:
                                        # For numeric types range with min and max values should be defined in the config file
                                        if field_rules['type'] == 'integer' or field_rules['type'] == 'float':
                                            if 'range' in field_rules:
                                                if 'min' in field_rules['range']:
                                                    if 'max' in field_rules["range"]:
                                                        # For int type min and max should be int values or -inf/inf
                                                        if field_rules['type'] == 'integer':
                                                            if isinstance(field_rules['range']['min'], int) or field_rules['range']['min'] == '-inf':
                                                                if isinstance(field_rules['range']['max'], int) or field_rules['range']['max'] == 'inf':
                                                                    pass
                                                                else:
                                                                    generalOutputInfo["error"] = True
                                                                    generalOutputInfo['infoMessages'].append({'error': 'The "range" -> "max" value ' + str(field_rules['range']['max']) + ' for the field "' + field_name + '" is not valid. Should be an integer number or value "inf"'})
                                                                    break
                                                            else:
                                                                generalOutputInfo["error"] = True
                                                                generalOutputInfo['infoMessages'].append({'error': 'The "range" -> "min" value ' + str(field_rules['range']['min']) + ' for the field "' + field_name + '" is not valid. Should be an integer number or value "-inf"'})
                                                                break
                                                        # For float type min and max should be int or float values or -inf/inf
                                                        elif field_rules['type'] == 'float':
                                                            if isinstance(field_rules['range']['min'], float) or isinstance(field_rules['range']['min'], int) or field_rules['range']['min'] == '-inf':
                                                                if isinstance(field_rules['range']['max'], float) or isinstance(field_rules['range']['max'], int) or field_rules['range']['max'] == 'inf':
                                                                    pass
                                                                else:
                                                                    generalOutputInfo["error"] = True
                                                                    generalOutputInfo['infoMessages'].append({'error': 'The "range" -> "max" value ' + str(field_rules['range']['max']) + ' for the field "' + field_name + '" is not valid. Should be a float number or value "inf"'})
                                                                    break
                                                            else:
                                                                generalOutputInfo["error"] = True
                                                                generalOutputInfo['infoMessages'].append({'error': 'The "range" -> "min" value ' + str(field_rules['range']['min']) + ' for the field "' + field_name + '" is not valid. Should be a float number or value "-inf"'})
                                                                break
                                                    else:
                                                        generalOutputInfo["error"] = True
                                                        generalOutputInfo['infoMessages'].append({'error': 'No "range" -> "max" key for the field "' + field_name + '" in JSON validation rules.'})
                                                        break
                                                else:
                                                    generalOutputInfo["error"] = True
                                                    generalOutputInfo['infoMessages'].append({'error': 'No "range" -> "min" key for the field "' + field_name + '" in JSON validation rules.'})
                                                    break
                                            else:
                                                generalOutputInfo["error"] = True
                                                generalOutputInfo['infoMessages'].append({'error': 'No "range" key for the field "' + field_name + '" in JSON validation rules.'})
                                                break
                                        # For text type length value should be defined in the config file
                                        elif field_rules['type'] == 'text':
                                            if 'length' in field_rules:
                                                if isinstance(field_rules['length'], int):
                                                    pass
                                                else:
                                                    generalOutputInfo["error"] = True
                                                    generalOutputInfo['infoMessages'].append({'error': 'The "length" value ' + str(field_rules['length']) + ' for the field "' + field_name + '" is not valid. Should be an integer number.'})
                                                    break
                                            else:
                                                generalOutputInfo["error"] = True
                                                generalOutputInfo['infoMessages'].append({'error': 'No "length" key for the field "' + field_name + '" in JSON validation rules.'})
                                                break
                                        # For date type no validation yet
                                        elif field_rules['type'] == 'date':
                                            pass

                                        # If domain is defined in the config file - it must be non-empty list of values
                                        if 'domain' in field_rules:
                                            if isinstance(field_rules['domain'], list):
                                                if len(field_rules['domain']) > 0:
                                                    if 'mapped_domains' in field_rules:
                                                        pass
                                                    else:
                                                        generalOutputInfo["error"] = True
                                                        generalOutputInfo['infoMessages'].append({'error': 'No domains mapped for the domain field "' + field_name + '".'})
                                                        break
                                                else:
                                                    generalOutputInfo["error"] = True
                                                    generalOutputInfo['infoMessages'].append({'error': 'The "domain" list is empty for the field "' + field_name + '" is not valid. Should be a least 1 value in the list.'})
                                                    break
                                            else:
                                                generalOutputInfo["error"] = True
                                                generalOutputInfo['infoMessages'].append({'error': 'The "domain" value ' + str(field_rules['domain']) + ' for the field "' + field_name + '" is not valid. Should be alist.'})
                                                break
                                    else:
                                        generalOutputInfo['error'] = True
                                        generalOutputInfo['infoMessages'].append({'error': 'The "type" value "'+ field_rules['type'] +'" for the field "' + field_name + '" is not valid. Should be one of the: ' + str(defined_types)})
                                        break                            
                                else:
                                    generalOutputInfo['error'] = True
                                    generalOutputInfo['infoMessages'].append({'error': 'No "type" key for the field "' + field_name + '" in JSON validation rules.'})
                                    break
                            else:
                                generalOutputInfo['error'] = True
                                generalOutputInfo['infoMessages'].append({'error': 'No "mandatory" key for the field "' + field_name + '" in JSON validation rules.'})
                                break
                    else:
                        generalOutputInfo['error'] = True
                        generalOutputInfo['infoMessages'].append({'error': 'No "fields" key in JSON validation rules.'})
                else:
                    generalOutputInfo['error'] = True
                    generalOutputInfo['infoMessages'].append({'error': 'No "geometry" key in JSON validation rules.'})
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'No "name" key in JSON validation rules.'})
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'No "userId" key in JSON validation rules.'})
        
    field_errors = {}
    field_rules = {}
    dataset_fields = []
    if not generalOutputInfo["error"]:
        try:
            input_fields = arcpy.ListFields(dataset_to_validate)
            for field in input_fields:
                dataset_fields.append(field.name)
        except Exception as e:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed read input dataset fields. ERROR: ' + str(e)})
        
    if not generalOutputInfo["error"]:
        for mapped_field in mapped_fields:
            if mapped_field[1] in dataset_fields:
                fields_to_process.append(mapped_field[1])
                output_fields.append(mapped_field[0])
                field_errors[mapped_field[1]] = {
                    "mandatory_no_val": {
                        "messages": [],
                        "count": 0
                    },
                    "mandatory_empty": {
                        "messages": [],
                        "count": 0
                    },
                    "relation_no_val": {
                        "messages": [],
                        "count": 0
                    },
                    "domain_no_val": {
                        "messages": [],
                        "count": 0
                    },
                    "too_long": {
                        "messages": [],
                        "count": 0
                    },
                    "out_of_range_int": {
                        "messages": [],
                        "count": 0
                    },
                    "not_integer": {
                        "messages": [],
                        "count": 0
                    },
                    "out_of_range_float": {
                        "messages": [],
                        "count": 0
                    },
                    "not_float": {
                        "messages": [],
                        "count": 0
                    }
                }
                field_rules[mapped_field[1]] = rules['fields'][mapped_field[0]]
            else:
                if mapped_field[0] in mandatory_fields:
                    generalOutputInfo["error"] = True
                    generalOutputInfo['infoMessages'].append({'error': 'Mandatory field "' + mapped_field[1] + '" is not present in the input dataset.'})
        
    if not generalOutputInfo["error"]:
        fields_to_process.append("SHAPE@")
        output_fields.append("SHAPE@")
        try:
            with arcpy.da.SearchCursor(dataset_to_validate, fields_to_process) as cursor:
                row_nr = 1
                for row in cursor:
                    error_in_row = False
                    input_row = []
                    datasetOutputInfo["featureCount"] += 1
                    col_nr = 0
                    #valid_input_values.append([])
                    # if convert_to_points == "true":
                        # lat_val = None
                        # lon_val = None
                    for field in fields_to_process:
                        field_val = row[col_nr]
                        if field != "SHAPE@":
                            #valid_input_values[row_nr-1].append(field_val)
                            # if convert_to_points == "true":
                                # if field == point_lat_field:
                                    # if isinstance(field_val, str):
                                        # field_val = field_val.replace(",", ".")
                                        # field_val = float(field_val)
                                    # lat_val = float(field_val)
                                # if field == point_lon_field:
                                    # if isinstance(field_val, str):
                                        # field_val = field_val.replace(",", ".")
                                        # field_val = float(field_val)
                                    # lon_val = float(field_val)
                            # Check if mandatory field has value
                            if field_rules[field]["mandatory"] == 'yes':
                                if field_val is None:
                                    error_in_row = True
                                    datasetOutputInfo["datasetError"] = True
                                    field_errors[field]["mandatory_no_val"]["count"] += 1
                                    if field_errors[field]["mandatory_no_val"]["count"] <= 5:
                                        field_errors[field]["mandatory_no_val"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": No value is not allowed for the mandatory field."})
                                else:
                                    if len(str(field_val).strip()) == 0:
                                        error_in_row = True
                                        datasetOutputInfo["datasetError"] = True
                                        field_errors[field]["mandatory_empty"]["count"] += 1
                                        if field_errors[field]["mandatory_empty"]["count"] <= 5:
                                            field_errors[field]["mandatory_empty"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Empty value for the mandatory field is not allowed."})

                            if "domain" in field_rules[field]:
                                if field_val is not None:
                                    field_val = str(field_val).strip()
                                    if len(field_val) > 0:
                                        domain_found = False
                                        for (hdomain, ddomain) in field_rules[field]["mapped_domains"].items():
                                            if field_val == ddomain:
                                                field_val = hdomain
                                                domain_found = True
                                                break
                                        if not domain_found:
                                            error_in_row = True
                                        #if field_val not in field_rules[field]["domain"]:
                                            datasetOutputInfo["datasetError"] = True
                                            field_errors[field]["domain_no_val"]["count"] += 1
                                            if field_errors[field]["domain_no_val"]["count"] <= 5:
                                                field_errors[field]["domain_no_val"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value '" + str(field_val) + "' is not in the code list."})
                            else:
                                if field_rules[field]["type"] == "text":
                                    if field_val is not None:
                                        field_val = str(field_val).strip()
                                        if len(field_val) == 0:
                                            field_val = None
                                        if field_val is not None:
                                            if len(str(field_val)) > field_rules[field]["length"]:
                                                error_in_row = True
                                                datasetOutputInfo["datasetError"] = True
                                                field_errors[field]["too_long"]["count"] += 1
                                                if field_errors[field]["too_long"]["count"] <= 5:
                                                    field_errors[field]["too_long"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value is " + str(len(str(field_val).strip())) + " character long. Max length for this field is " + str(field_rules[field]["length"])})
                                elif field_rules[field]["type"] == "integer" or field_rules[field]["type"] == "float":
                                    if field_val is not None:
                                        if ((not isinstance(field_val, int)) and (not isinstance(field_val, float))):
                                            if field_val == "" or not field_val:
                                                field_val = None
                                            if isinstance(field_val, str):
                                                field_val = field_val.strip()
                                                if len(field_val) == 0 or not field_val:
                                                    field_val = None
                                    if field_val is not None:
                                        min_val = field_rules[field]["range"]["min"]
                                        max_val = field_rules[field]["range"]["max"]
                                        if field_rules[field]["type"] == "integer":
                                            try:
                                                field_val = int(field_val)
                                            except:
                                                pass
                                            if isinstance(field_val, int):
                                                if field_rules[field]["range"]["min"] == "-inf":
                                                    min_val = sys.maxsize * -1
                                                if field_rules[field]["range"]["max"] == "inf":
                                                    max_val = sys.maxsize
                                                if field_val < min_val or field_val > max_val:
                                                    error_in_row = True
                                                    datasetOutputInfo["datasetError"] = True
                                                    field_errors[field]["out_of_range_int"]["count"] += 1
                                                    if field_errors[field]["out_of_range_int"]["count"] <= 5:
                                                        field_errors[field]["out_of_range_int"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value '" + str(field_val) + "' is out of range: " + str(min_val) + " .. " + str(max_val)})
                                            else:
                                                error_in_row = True
                                                datasetOutputInfo["datasetError"] = True
                                                field_errors[field]["not_integer"]["count"] += 1
                                                if field_errors[field]["not_integer"]["count"] <= 5:
                                                    field_errors[field]["not_integer"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value '" + str(field_val) + "' is not an integer number."})
                                        elif field_rules[field]["type"] == "float":
                                            if isinstance(field_val, str):
                                                field_val = field_val.replace(",", ".")
                                            try:
                                                field_val = float(field_val)
                                            except:
                                                pass
                                            if isinstance(field_val, float):
                                                if field_rules[field]["range"]["min"] == "-inf":
                                                    min_val = sys.float_info.min
                                                if field_rules[field]["range"]["max"] == "inf":
                                                    max_val = sys.float_info.max
                                                if field_val < min_val or field_val > max_val:
                                                    error_in_row = True
                                                    datasetOutputInfo["datasetError"] = True
                                                    field_errors[field]["out_of_range_float"]["count"] += 1
                                                    if field_errors[field]["out_of_range_float"]["count"] <= 5:
                                                        field_errors[field]["out_of_range_float"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value '" + str(field_val) + "' is out of range: " + str(min_val) + " .. " + str(max_val)})
                                            else:
                                                error_in_row = True
                                                datasetOutputInfo["datasetError"] = True
                                                field_errors[field]["not_float"]["count"] += 1
                                                if field_errors[field]["not_float"]["count"] <= 5:
                                                    field_errors[field]["not_float"]["messages"].append({"error": "Row " + str(row_nr) + ", field \"" + field + "\": Value '" + str(field_val) + "' is not a decimal number."})
                        #if not error_in_row:
                            #valid_input_values[row_nr-1].append(field_val)
                        input_row.append(field_val)
                        col_nr += 1
                    # if convert_to_points == "true":
                        # pointTuple = (lon_val, lat_val)
                        # in_sr = arcpy.SpatialReference(4326)
                        # if out_sr.factoryCode != 4326:
                            # point = arcpy.Point()
                            # point.X = lon_val
                            # point.Y = lat_val
                            # pointGeometry = arcpy.PointGeometry(point, in_sr)
                            # projectedPointGeometry = pointGeometry.projectAs(out_sr)
                            # pointTuple = (projectedPointGeometry.firstPoint.X, projectedPointGeometry.firstPoint.Y)
                        # valid_input_values[row_nr-1].append(pointTuple)
                    if not error_in_row:
                        valid_input_values.append(input_row)
                    row_nr += 1

                for field in fields_to_process:
                    if field != "SHAPE@":
                        for (key, value) in field_errors[field].items():
                            if value["count"] > 0:
                                for message in value["messages"]:
                                    datasetOutputInfo["infoMessages"].append(message)
                                if value["count"] > 5:
                                    datasetOutputInfo["infoMessages"].append({"error_summary": str(value["count"] - 5) + " more similar errors as above."})
                                datasetOutputInfo["datasetErrorCount"] += value["count"]
        except Exception as e:
            generalOutputInfo["error"] = True
            generalOutputInfo['infoMessages'].append({'error': 'Can not read input datasetfor validation. ERROR: ' + str(e)})
            
    if not generalOutputInfo["error"]:
        if not datasetOutputInfo["datasetError"]:
            try:
                spatial_ref = arcpy.Describe(output_dataset_path).spatialReference
                arcpy.management.CreateFeatureclass(work_gdb, 'tmp_'  + str(time),  rules['geometry'].upper(), output_dataset_path, 'DISABLED', 'DISABLED', spatial_ref)
            except Exception as e:
                generalOutputInfo["error"] = True
                generalOutputInfo['infoMessages'].append({'error': 'Can not create empty feature class for upload. ERROR: ' + str(e)})
            
    if not generalOutputInfo["error"]:
        if not datasetOutputInfo["datasetError"]:
            try:
                output_fields.append('upload_user')
                output_fields.append('upload_date')
                with arcpy.da.InsertCursor(tmp_dataset_path, output_fields) as cursor:
                    for row in valid_input_values:
                        row.append(userId)
                        row.append(dt)
                        cursor.insertRow(row)
                datasetOutputInfo["intermediateDataset"] = tmp_dataset_path
                datasetOutputInfo["outputDataset"] = output_dataset_path
            except Exception as e:
                generalOutputInfo["error"] = True
                generalOutputInfo['infoMessages'].append({'error': 'Can not insert values to the feature class for upload. ERROR: ' + str(e)})
                
    try:
        if arcpy.Exists(dataset_to_validate):
            arcpy.Delete_management(dataset_to_validate)
    except Exception as e:
        generalOutputInfo['infoMessages'].append({'warning': 'Failed to delete input dataset. Reason: ' + str(e)})
        
    arcpy.SetParameter(3, json.dumps(datasetOutputInfo, ensure_ascii = False))
    arcpy.SetParameter(4, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))