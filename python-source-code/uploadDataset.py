import arcpy
import os
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    input_dataset_path = arcpy.GetParameterAsText(0)
    output_dataset_path = arcpy.GetParameterAsText(1)
    generalOutputInfo = {'error': False, 'infoMessages': []}
        
    try:
        if arcpy.Exists(input_dataset_path):
            if arcpy.Exists(output_dataset_path):
                arcpy.management.Append(input_dataset_path, output_dataset_path, "TEST")
                generalOutputInfo['infoMessages'].append({'message': 'Dataset uploaded.'})
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Output dataset does not exist.'})
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read input dataset.'})
    except Exception as e:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed to append input dataset to output. ERROR: ' + str(e)})
    
    if not generalOutputInfo['error']:
        try:
            arcpy.Delete_management(input_dataset_path)
        except Exception as e:
            generalOutputInfo['infoMessages'].append({'warning': 'Failed to delete input dataset. Reason: ' + str(e)})
            
    arcpy.SetParameter(2, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))